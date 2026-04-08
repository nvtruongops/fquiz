import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import { connectDB } from '@/lib/mongodb'
import { Types } from 'mongoose'
import { Category } from '@/models/Category'
import { uploadImage } from '@/lib/cloudinary'
import { CreateStudentQuizSchema, validateObjectId } from '@/lib/schemas'

function buildSourceMappings(quizzes: any[]) {
  const sourceQuizIdByDisplayId = new Map<string, string>()
  const originalSourceIds = new Set<string>()

  for (const quiz of quizzes) {
    const displayId = quiz._id.toString()
    const sourceId = quiz.is_saved_from_explore && quiz.original_quiz_id?._id
      ? quiz.original_quiz_id._id.toString()
      : displayId
    sourceQuizIdByDisplayId.set(displayId, sourceId)

    if (quiz.is_saved_from_explore && quiz.original_quiz_id?._id) {
      originalSourceIds.add(quiz.original_quiz_id._id.toString())
    }
  }

  return { sourceQuizIdByDisplayId, originalSourceIds }
}

async function fetchSourceAvailabilityMap(originalSourceIds: Set<string>) {
  const sourceAvailabilityByOriginalId = new Map<string, boolean>()
  if (originalSourceIds.size === 0) return sourceAvailabilityByOriginalId

  const originalMeta = await Quiz.find({ _id: { $in: Array.from(originalSourceIds).map((id) => new Types.ObjectId(id)) } })
    .select('_id status is_public')
    .lean()

  for (const meta of originalMeta as any[]) {
    sourceAvailabilityByOriginalId.set(
      meta._id.toString(),
      Boolean(meta.status === 'published' && meta.is_public)
    )
  }

  return sourceAvailabilityByOriginalId
}

async function fetchSessionMaps(userId: string, sourceQuizIdByDisplayId: Map<string, string>) {
  const sourceQuizIds = Array.from(new Set(Array.from(sourceQuizIdByDisplayId.values())))
    .map((id) => new Types.ObjectId(id))

  if (sourceQuizIds.length === 0) {
    return {
      latestSessionBySourceQuizId: new Map<string, any>(),
      durationBySourceQuizId: new Map<string, number>(),
    }
  }

  const [latestSessions, durationBySourceQuiz] = await Promise.all([
    QuizSession.aggregate([
      {
        $match: {
          student_id: new Types.ObjectId(userId),
          status: 'completed',
          quiz_id: { $in: sourceQuizIds },
        },
      },
      { $sort: { completed_at: -1 } },
      {
        $group: {
          _id: '$quiz_id',
          latestSession: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$latestSession' } },
    ]),
    QuizSession.aggregate([
      {
        $match: {
          student_id: new Types.ObjectId(userId),
          status: 'completed',
          quiz_id: { $in: sourceQuizIds },
        },
      },
      {
        $group: {
          _id: '$quiz_id',
          totalDurationMs: {
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ['$completed_at', '$started_at'] },
                    '$started_at',
                  ],
                },
              ],
            },
          },
        },
      },
    ]),
  ])

  const latestSessionBySourceQuizId = new Map<string, any>()
  for (const session of latestSessions) {
    latestSessionBySourceQuizId.set(session.quiz_id.toString(), session)
  }

  const durationBySourceQuizId = new Map<string, number>()
  for (const item of durationBySourceQuiz) {
    durationBySourceQuizId.set(item._id.toString(), Number(item.totalDurationMs ?? 0))
  }

  return { latestSessionBySourceQuizId, durationBySourceQuizId }
}

function mapQuizzesForResponse(
  quizzes: any[],
  sourceQuizIdByDisplayId: Map<string, string>,
  sourceAvailabilityByOriginalId: Map<string, boolean>,
  latestSessionBySourceQuizId: Map<string, any>,
  durationBySourceQuizId: Map<string, number>
) {
  return quizzes.map((q: any) => {
    const original = q.original_quiz_id
    const count = q.questionCount ||
      original?.questionCount ||
      (Array.isArray(original?.questions) ? original.questions.length : 0) ||
      (Array.isArray(q.questions) ? q.questions.length : 0)

    const displayId = q._id.toString()
    const sourceId = sourceQuizIdByDisplayId.get(displayId) ?? displayId
    const latestSession = latestSessionBySourceQuizId.get(sourceId)
    const totalStudyMinutes = Math.round((durationBySourceQuizId.get(sourceId) ?? 0) / (60 * 1000))
    const latestCorrectCount = latestSession?.score ?? null
    const latestTotalCount = count
    const latestScoreOnTen =
      latestCorrectCount !== null && latestTotalCount > 0
        ? Number(((latestCorrectCount / latestTotalCount) * 10).toFixed(2))
        : null

    let sourceStatus: 'available' | 'source_locked' | 'not_applicable' = 'not_applicable'
    if (q.is_saved_from_explore) {
      const originalId = original?._id?.toString?.() || ''
      sourceStatus = sourceAvailabilityByOriginalId.get(originalId) ? 'available' : 'source_locked'
    }

    return {
      ...q,
      questionCount: count,
      latestCorrectCount,
      latestTotalCount,
      latestScoreOnTen,
      totalStudyMinutes,
      sourceStatus,
      questions: undefined,
      original_quiz_id: undefined,
    }
  })
}

export async function GET(req: Request) {
  try {
    await connectDB()
    const payload = await verifyToken(req)
    if (payload?.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')

    // Validate categoryId if provided
    if (categoryId && !validateObjectId(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400 })
    }

    // Lấy tất cả bộ đề của user (bao gồm cả bộ soạn thảo và bộ lưu/shortcut)
    const query: any = { created_by: new Types.ObjectId(payload.userId) }
    if (categoryId) query.category_id = new Types.ObjectId(categoryId)

    const quizzes = await Quiz.find(query)
      .select('title course_code questionCount questions status is_public created_at category_id original_quiz_id is_saved_from_explore')
      .populate('category_id', 'name')
      .populate({
        path: 'original_quiz_id',
        select: 'questionCount questions'
      })
      .sort({ created_at: -1 })
      .lean()

    const { sourceQuizIdByDisplayId, originalSourceIds } = buildSourceMappings(quizzes as any[])
    const sourceAvailabilityByOriginalId = await fetchSourceAvailabilityMap(originalSourceIds)
    const { latestSessionBySourceQuizId, durationBySourceQuizId } = await fetchSessionMaps(payload.userId, sourceQuizIdByDisplayId)
    const formattedQuizzes = mapQuizzesForResponse(
      quizzes as any[],
      sourceQuizIdByDisplayId,
      sourceAvailabilityByOriginalId,
      latestSessionBySourceQuizId,
      durationBySourceQuizId
    )

    return NextResponse.json({ quizzes: formattedQuizzes })
  } catch (error) {
    console.error('Error fetching student quizzes:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await connectDB()
    const payload = await verifyToken(req)
    if (payload?.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Validate with schema
    const parsed = CreateStudentQuizSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { course_code, category_id, questions, title } = parsed.data
    const normalizedCourseCode = course_code.trim().toUpperCase()

    const existingOwnedQuiz = await Quiz.findOne({
      created_by: new Types.ObjectId(payload.userId),
      is_saved_from_explore: { $ne: true },
      course_code: normalizedCourseCode,
    })
      .select('_id')
      .lean()

    if (existingOwnedQuiz) {
      return NextResponse.json(
        { error: `Mã quiz ${normalizedCourseCode} đã tồn tại trong bộ đề tự tạo của bạn.` },
        { status: 409 }
      )
    }

    // Verify category exists
    const category = await Category.findById(category_id)
    if (!category) {
      return NextResponse.json({ error: 'Danh mục không tồn tại.' }, { status: 404 })
    }

    // 1. Generate quiz ID first for image folder organization
    const quizId = new Types.ObjectId()

    // 2. Process questions and upload images to Cloudinary
    const processedQuestions = await Promise.all(
      questions.map(async (q, index: number) => {
        let finalImageUrl = q.image_url

        // Check if image_url is base64
        if (q.image_url?.startsWith('data:image')) {
          try {
            finalImageUrl = await uploadImage(q.image_url, {
              folder: `fquiz/quizzes/${quizId}/questions`,
              public_id: `q_${index}_${Date.now()}`
            })
          } catch (uploadErr) {
            console.error(`Failed to upload image for question ${index}:`, uploadErr)
            finalImageUrl = undefined
          }
        }

        return {
          text: q.text || '',
          options: q.options || [],
          correct_answer: q.correct_answer || [],
          explanation: q.explanation || '',
          image_url: finalImageUrl || '',
        }
      })
    )

    const quiz = await Quiz.create({
      _id: quizId,
      title: title || `Bộ đề ${course_code}`,
      course_code: normalizedCourseCode,
      category_id,
      created_by: new Types.ObjectId(payload.userId),
      is_public: false, // Default to private for students
      status: 'draft',
      questions: processedQuestions,
      questionCount: processedQuestions.length
    })

    return NextResponse.json({ quiz }, { status: 201 })
  } catch (error) {
    console.error('Error creating quiz:', error)
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'Mã quiz đã tồn tại trong bộ đề tự tạo của bạn.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
