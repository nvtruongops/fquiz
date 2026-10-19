import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { validationErrorResponse } from '@/lib/core/api-helpers'
import { syncQuizToQuestionBank } from '@/lib/modules/quiz/question-bank-manager'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { SyncQuizSchema } from '@/lib/modules/quiz/schemas/quiz'


/**
 * POST /api/question-bank/sync
 * Sync quiz questions into subject question bank
 * Automatically skip questions with conflicting answers
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

    // Find quiz_id if not provided
    let resolvedQuizId = quiz_id
    if (!resolvedQuizId) {
      const quiz = await Quiz.findOne({ course_code, category_id })
        .select('_id')
        .lean()
      if (quiz) {
        resolvedQuizId = String(quiz._id)
      }
    }

    // Sync to bank
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
        ? `⚠️ Synced ${result.synced}/${questions.length} questions. ${result.conflicts.length} questions skipped due to conflicting answers.`
        : `✅ Successfully synced ${result.synced} questions to the subject question bank.`
    })
  } catch (error: any) {
    console.error('Error syncing to question bank:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['admin', 'student'] })