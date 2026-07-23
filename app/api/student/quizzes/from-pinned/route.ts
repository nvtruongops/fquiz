import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Category } from '@/lib/modules/quiz/models/Category'
import { PinnedQuestion } from '@/lib/modules/quiz/models/PinnedQuestion'
import { Types } from 'mongoose'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'
import { parseJsonBody } from '@/lib/core/api-helpers'

/**
 * POST /api/student/quizzes/from-pinned
 * Body: { course_code: string, title?: string }
 * Creates a custom quiz saved in /my-quizzes from student's pinned questions of course_code.
 * Enforces max 10 custom quizzes quota limit.
 */
export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const body = await parseJsonBody(req)
    if (body instanceof NextResponse) return body

    const { course_code, title } = body as any
    if (!course_code || typeof course_code !== 'string') {
      return NextResponse.json({ error: 'Mã môn học là bắt buộc.' }, { status: 400 })
    }

    const normalizedCourseCode = course_code.trim().toUpperCase()
    const userObjectId = new Types.ObjectId(payload.userId)

    // 1. Quota Check — Max 10 custom/created/mix quizzes combined
    const totalCreatedAndMix = await Quiz.countDocuments({
      created_by: userObjectId,
      is_saved_from_explore: { $ne: true },
    })

    if (totalCreatedAndMix >= 10) {
      return NextResponse.json(
        {
          error: 'Bạn đã đạt giới hạn tối đa 10 bộ đề (tự tạo + trộn). Vui lòng xóa bớt 1 bài cũ tại Bộ đề của tôi để tạo bài mới.',
          quotaExceeded: true,
          code: 'TOTAL_QUOTA_EXCEEDED',
        },
        { status: 409 }
      )
    }

    // 2. Fetch pinned questions for this course
    const pinnedDocs = await PinnedQuestion.find({
      student_id: userObjectId,
      course_code: normalizedCourseCode,
    }).sort({ created_at: -1 }).lean()

    if (!pinnedDocs || pinnedDocs.length === 0) {
      return NextResponse.json(
        { error: `Chưa có câu hỏi nào được ghim cho môn ${normalizedCourseCode}.` },
        { status: 400 }
      )
    }

    // 3. Resolve category ID
    let category = await Category.findOne({
      name: { $regex: new RegExp(`^${normalizedCourseCode}$`, 'i') },
    }).select('_id name').lean() as any

    if (!category) {
      // Fallback: find any category or create temporary category doc
      const firstCat = await Category.findOne().select('_id').lean()
      if (firstCat) {
        category = firstCat
      } else {
        const newCat = await Category.create({
          name: normalizedCourseCode,
          description: `Danh mục môn học ${normalizedCourseCode}`,
        })
        category = newCat
      }
    }

    // 4. Transform pinned questions to Quiz questions format
    const quizQuestions = pinnedDocs.map((pq: any) => ({
      text: pq.text || '',
      options: Array.isArray(pq.options) ? pq.options : [],
      correct_answer: Array.isArray(pq.correct_answer) ? pq.correct_answer : [0],
      explanation: pq.explanation || '',
      image_url: pq.image_url || '',
      question_id: pq.question_id || generateQuestionId(pq),
    }))

    // 5. Generate quiz title
    const customTitle = title && typeof title === 'string' && title.trim().length > 0
      ? title.trim()
      : `${normalizedCourseCode} - GHIM (${quizQuestions.length} CÂU)`

    const quizId = new Types.ObjectId()
    const quiz = await Quiz.create({
      _id: quizId,
      title: customTitle,
      course_code: normalizedCourseCode,
      description: `Bộ đề tự tạo từ ${quizQuestions.length} câu hỏi đã ghim của môn ${normalizedCourseCode}`,
      category_id: category._id,
      created_by: userObjectId,
      is_public: false,
      status: 'published',
      questions: quizQuestions,
      questionCount: quizQuestions.length,
    })

    return NextResponse.json({
      quiz,
      message: `Đã tạo bộ đề ghim (${quizQuestions.length} câu) thành công!`,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating quiz from pinned questions:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })
