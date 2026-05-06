import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken, requireRole } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { User } from '@/models/User'
import { Category } from '@/models/Category'
import { CreateQuizSchema, SaveDraftQuizSchema, AdminCreateQuizSchema, AdminSaveDraftQuizSchema } from '@/lib/schemas'
import { QuizSession } from '@/models/QuizSession'
import { analyzeQuizCompleteness } from '@/lib/quiz-analyzer'
import { checkQuestionsInBank, syncQuizToQuestionBank } from '@/lib/question-bank-manager'
import { generateQuestionId } from '@/lib/question-id-generator'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(payload, 'admin')

    const { searchParams } = new URL(req.url)
    
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') ?? '20', 10) || 20))
    const categoryRaw = (searchParams.get('category_id') ?? '').trim()
    const categoryId = /^[a-fA-F0-9]{24}$/.test(categoryRaw) ? categoryRaw.toLowerCase() : ''
    const search = (searchParams.get('search') ?? '').trim().slice(0, 200)
    const skip = (page - 1) * limit

    await connectDB()

    const adminUsers = await User.find({ role: 'admin' }).select('_id').lean()
    const adminIds = adminUsers.map((u: any) => u._id)

    const query: any = {
      is_saved_from_explore: { $ne: true },
      $and: [
        {
          $or: [
            { created_by: { $in: adminIds } },
            { created_by: null },
            { created_by: { $exists: false } },
          ],
        },
      ],
    }
    if (categoryId) query.category_id = categoryId
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$and.push({
        $or: [
          { title: { $regex: escaped, $options: 'i' } },
          { course_code: { $regex: escaped, $options: 'i' } },
        ],
      })
    }

    const [quizzesRaw, total] = await Promise.all([
      Quiz.find(query).skip(skip).limit(limit).sort({ created_at: -1 }).lean(),
      Quiz.countDocuments(query),
    ])

    // Enrich with student count
    const quizzes = await Promise.all(
      quizzesRaw.map(async (quiz: any) => {
        const uniqueStudents = await QuizSession.distinct('student_id', {
          quiz_id: quiz._id,
          // Đếm cả active và completed sessions - tính ngay khi user bắt đầu làm
        })
        const studentCount = uniqueStudents.length
        const actualQuestionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0
        const declaredQuestionCount = Number(quiz.questionCount ?? 0)
        const normalizedQuestionCount = actualQuestionCount > 0 ? actualQuestionCount : declaredQuestionCount

        if (actualQuestionCount > 0 && declaredQuestionCount !== actualQuestionCount) {
          await Quiz.updateOne(
            { _id: quiz._id },
            { $set: { questionCount: actualQuestionCount } }
          )
        }

        return {
          ...quiz,
          questionCount: normalizedQuestionCount,
          studentCount,
        }
      })
    )

    return NextResponse.json({ quizzes, total, page })
  } catch (err) {
    console.error('Error fetching quizzes:', err)
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

export async function POST(req: Request) {
  try {
    const userPayload = await verifyToken(req)
    if (!userPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(userPayload, 'admin')

    await connectDB()
    const body = await req.json()
    const isDraft = body.status === 'draft'
    const parsed = isDraft
      ? AdminSaveDraftQuizSchema.safeParse(body)
      : AdminCreateQuizSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
    }

    const { category_id, course_code, questions, status, description } = parsed.data
    const normalizedCourseCode = course_code.trim().toUpperCase()

    const category = await Category.findOne({
      _id: category_id,
      type: 'public',
      status: 'approved',
    })
      .select('_id')
      .lean()

    if (!category) {
      return NextResponse.json(
        { error: 'Danh mục không hợp lệ cho admin (chỉ cho phép môn học public đã duyệt).' },
        { status: 400 }
      )
    }

    const existingOwnedQuiz = await Quiz.findOne({
      created_by: new mongoose.Types.ObjectId(userPayload.userId),
      is_saved_from_explore: { $ne: true },
      course_code: normalizedCourseCode,
    })
      .select('_id')
      .lean()

    if (existingOwnedQuiz) {
      return NextResponse.json(
        { error: `Mã quiz ${normalizedCourseCode} đã tồn tại trong kho quiz của bạn.` },
        { status: 409 }
      )
    }

    // 1. Strict Validation for Publishing
    if (status === 'published') {
       const diagnostics = analyzeQuizCompleteness(parsed.data)
       if (!diagnostics.isValid) {
         return NextResponse.json({ 
           error: 'Không thể công khai quiz chưa hoàn thiện', 
           diagnostics 
         }, { status: 400 })
       }
    }

    // 2. CHECK QUESTION BANK - Kiểm tra mâu thuẫn với câu hỏi đã có
    const bankConflicts = await checkQuestionsInBank(category_id, questions)
    const differentAnswerConflicts: any[] = []
    const sameAnswerConflicts: any[] = []

    bankConflicts.forEach((conflict, index) => {
      if (conflict.conflictType === 'different_answer') {
        differentAnswerConflicts.push({
          questionIndex: index,
          question: questions[index],
          ...conflict
        })
      } else if (conflict.conflictType === 'same_answer') {
        sameAnswerConflicts.push({
          questionIndex: index,
          question: questions[index],
          ...conflict
        })
      }
    })

    // Nếu có mâu thuẫn đáp án, trả về cảnh báo (không block, để user quyết định)
    if (differentAnswerConflicts.length > 0) {
      return NextResponse.json({
        error: 'question_bank_conflict',
        message: ` Phát hiện ${differentAnswerConflicts.length} câu hỏi có mâu thuẫn đáp án với ngân hàng môn học!`,
        conflicts: {
          different_answer: differentAnswerConflicts,
          same_answer: sameAnswerConflicts
        },
        total_conflicts: differentAnswerConflicts.length,
        suggestion: 'Vui lòng kiểm tra và sửa đáp án cho các câu hỏi bị mâu thuẫn, hoặc xác nhận để tiếp tục (sẽ không đồng bộ các câu mâu thuẫn vào ngân hàng).'
      }, { status: 409 })
    }

    // 3. Generate quiz ID first for folder organization
    const quizId = new mongoose.Types.ObjectId()

    // 4. Process questions - Add question_id
    const processedQuestions = questions.map((q: any) => {
      // Only accept direct image URLs, not base64
      const finalImageUrl = q.image_url?.startsWith('data:image') ? '' : q.image_url

      return {
        ...q,
        question_id: generateQuestionId(q),
        image_url: finalImageUrl || '',
      }
    })

    const quiz = await Quiz.create({
      _id: quizId,
      title: normalizedCourseCode,
      description: description || '',
      category_id,
      course_code: normalizedCourseCode,
      questions: processedQuestions,
      created_by: userPayload.userId,
      status: status || 'published',
      is_public: (status || 'published') === 'published',
    })

    // 5. SYNC TO QUESTION BANK - Đồng bộ vào ngân hàng môn học
    // Chỉ sync khi published và không có mâu thuẫn
    if ((status || 'published') === 'published') {
      try {
        await syncQuizToQuestionBank(
          category_id,
          normalizedCourseCode,
          questions,
          userPayload.userId
        )
      } catch (syncError) {
        console.error('Failed to sync to question bank:', syncError)
        // Không fail toàn bộ request nếu sync lỗi
      }
    }

    return NextResponse.json({ 
      quiz,
      question_bank_info: sameAnswerConflicts.length > 0
        ? `✅ ${sameAnswerConflicts.length} câu hỏi đã tồn tại trong ngân hàng môn học`
        : '✅ Tất cả câu hỏi đã được thêm vào ngân hàng môn học'
    }, { status: 201 })
  } catch (err) {
    console.error('Quiz creation error:', err)
    if (err instanceof Response) return err
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'Mã quiz đã tồn tại trong kho quiz của bạn.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
