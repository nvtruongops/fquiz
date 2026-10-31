import { AdminCreateQuizSchema, AdminSaveDraftQuizSchema } from '@fquiz/models'
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Quiz } from '@/lib/models/Quiz'
import { User } from '@/lib/models/User'
import { Category } from '@/lib/models/Category'
import { QuizListQuerySchema } from '@/lib/schemas/common'
import mongoose from 'mongoose'
import { refreshQuestionBankUsageCache } from '@/lib/question-bank/usage-cache'

export const GET = withAuth(async (req) => {
  const url = new URL(req.url)
  const queryParams = Object.fromEntries(url.searchParams.entries())

  const parsed = QuizListQuerySchema.safeParse(queryParams)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const { page, limit, category_id, search, status } = parsed.data

  await connectDB()

  // Fetch student/teacher IDs and admin/dev IDs in parallel
  const [nonAdminUsers, adminUsers] = await Promise.all([
    User.find({ role: { $in: ['student', 'teacher'] } }).select('_id').lean(),
    User.find({ role: { $in: ['admin', 'dev'] } }).select('_id').lean(),
  ])
  const nonAdminIds = nonAdminUsers.map((u: any) => u._id)
  const adminIds = adminUsers.map((u: any) => u._id)

  const andConditions: any[] = [
    { is_saved_from_explore: { $ne: true } },
    { is_temp: { $ne: true } },
    {
      $or: [
        { author_id: { $in: adminIds } },
        { created_by: { $in: adminIds } },
        {
          $and: [
            { author_id: { $in: [null, undefined] } },
            { created_by: { $in: [null, undefined] } },
          ],
        },
      ],
    },
  ]

  if (nonAdminIds.length > 0) {
    andConditions.push(
      { author_id: { $nin: nonAdminIds } },
      { created_by: { $nin: nonAdminIds } }
    )
  }

  if (category_id) {
    andConditions.push({ category_id: new mongoose.Types.ObjectId(category_id) })
  }

  if (status) {
    andConditions.push({ status })
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    andConditions.push({
      $or: [
        { title: { $regex: escaped, $options: 'i' } },
        { course_code: { $regex: escaped, $options: 'i' } },
      ],
    })
  }

  const filter = { $and: andConditions }

  const [quizzes, total] = await Promise.all([
    Quiz.find(filter)
      .select('title course_code category_id questionCount studentCount status is_public created_at')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Quiz.countDocuments(filter),
  ])

  return NextResponse.json({
    quizzes,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
})

export const POST = withAuth(async (req, { payload }) => {
  try {
    const body = await req.json().catch(() => ({}))

    const parsed = (body.status === 'draft' ? AdminSaveDraftQuizSchema : AdminCreateQuizSchema).safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
    const { course_code, category_id, description, questions, status } = parsed.data
    const { title } = body
    await connectDB()

    const normalizedCode = String(course_code).trim().toUpperCase()

    // Validate category
    const category = await Category.findById(category_id).lean()
    if (!category) {
      return NextResponse.json({ error: 'Category does not exist' }, { status: 400 })
    }

    const processedQuestions = questions

    const adminUserId = new mongoose.Types.ObjectId(payload.userId)

    const quiz = await Quiz.create({
      title: title || normalizedCode,
      course_code: normalizedCode,
      category_id: new mongoose.Types.ObjectId(category_id),
      description: description || '',
      questions: processedQuestions,
      questionCount: processedQuestions.length,
      author_id: adminUserId,
      created_by: adminUserId,
      status: status || 'published',
      is_public: status === 'published',
      is_saved_from_explore: false,
      is_temp: false,
      visibility: 'public',
    })

    const questionBankUsageRefreshed = await refreshQuestionBankUsageCache()

    return NextResponse.json({ quiz, question_bank_usage_refreshed: questionBankUsageRefreshed }, { status: 201 })
  } catch (err: any) {
    console.error('Create quiz error:', err)
    if (err.code === 11000) {
      return NextResponse.json({ error: 'Quiz code or quiz already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: err.message || 'Failed to create quiz' }, { status: 500 })
  }
})
