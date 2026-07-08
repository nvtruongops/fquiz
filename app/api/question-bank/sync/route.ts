import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { validationErrorResponse } from '@/lib/core/api-helpers'
import { syncQuizToQuestionBank } from '@/lib/modules/quiz/question-bank-manager'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import {
  QuestionInputSchema,
  SyncQuizSchema,
} from '@/lib/modules/quiz/schemas/quiz'


/**
 * POST /api/question-bank/sync
 * Đồng bộ câu hỏi của quiz vào ngân hàng môn học
 * Tự động bỏ qua câu hỏi có mâu thuẫn đáp án
 */
export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    const body = await req.json()
    const parsed = SyncQuizSchema.safeParse(body)

    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    const { category_id, course_code, quiz_id, questions } = parsed.data

    await connectDB()

    // Tìm quiz_id nếu không được cung cấp
    let resolvedQuizId = quiz_id
    if (!resolvedQuizId) {
      const quiz = await Quiz.findOne({ course_code, category_id })
        .select('_id')
        .lean()
      if (quiz) {
        resolvedQuizId = String(quiz._id)
      }
    }

    // Đồng bộ vào ngân hàng
    const result = await syncQuizToQuestionBank(
      category_id,
      course_code,
      questions,
      payload.userId,
      resolvedQuizId
    )

    return NextResponse.json({
      success: true,
      synced: result.synced,
      new_questions: result.new,
      existing_questions: result.existing,
      conflicts: result.conflicts.length,
      conflict_details: result.conflicts,
      message: result.conflicts.length > 0
        ? ` Đã đồng bộ ${result.synced}/${questions.length} câu hỏi. ${result.conflicts.length} câu bị bỏ qua do mâu thuẫn đáp án.`
        : `✅ Đã đồng bộ thành công ${result.synced} câu hỏi vào ngân hàng môn học.`
    })
  } catch (error: any) {
    console.error('Error syncing to question bank:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['admin', 'student'] })