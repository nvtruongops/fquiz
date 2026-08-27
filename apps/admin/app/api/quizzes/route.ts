import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Quiz } from '@/lib/models/Quiz'
import { User } from '@/lib/models/User'
import { Category } from '@/lib/models/Category'
import { QuizListQuerySchema } from '@/lib/schemas/common'
import mongoose from 'mongoose'

export const GET = withAuth(async (req) => {
  const url = new URL(req.url)
  const queryParams = Object.fromEntries(url.searchParams.entries())

  const parsed = QuizListQuerySchema.safeParse(queryParams)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Tham số truy vấn không hợp lệ' }, { status: 400 })
  }

  const { page, limit, category_id, search, status } = parsed.data

  await connectDB()

  // Fetch student & teacher IDs to strictly exclude all user-created quizzes
  const nonAdminUsers = await User.find({ role: { $in: ['student', 'teacher'] } }).select('_id').lean()
  const nonAdminIds = nonAdminUsers.map((u: any) => u._id)

  // Fetch admin & dev user IDs
  const adminUsers = await User.find({ role: { $in: ['admin', 'dev'] } }).select('_id').lean()
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
    await connectDB()
    const body = await req.json().catch(() => ({}))

    const { title, course_code, category_id, description, questions, status = 'published' } = body

    if (!course_code || !category_id) {
      return NextResponse.json({ error: 'Mã môn và danh mục là bắt buộc' }, { status: 400 })
    }

    const normalizedCode = String(course_code).trim().toUpperCase()

    // Validate category
    const category = await Category.findById(category_id).lean()
    if (!category) {
      return NextResponse.json({ error: 'Danh mục môn học không tồn tại' }, { status: 400 })
    }

    const processedQuestions = (Array.isArray(questions) ? questions : []).map((q: any) => ({
      text: q.text || '',
      options: Array.isArray(q.options) ? q.options : [],
      correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer : [0],
      explanation: q.explanation || '',
      image_url: q.image_url || '',
    }))

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

    return NextResponse.json({ quiz }, { status: 201 })
  } catch (err: any) {
    console.error('Create quiz error:', err)
    if (err.code === 11000) {
      return NextResponse.json({ error: 'Mã môn học hoặc quiz đã tồn tại' }, { status: 409 })
    }
    return NextResponse.json({ error: err.message || 'Lỗi tạo đề thi' }, { status: 500 })
  }
})
