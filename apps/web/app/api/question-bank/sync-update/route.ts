import { planAndPrepareQuestionSynchronization, prepareQuestionSyncRequest, saveSynchronizedQuizzes } from '@fquiz/models'
import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'


/**
 * POST /api/question-bank/sync-update
 * Update question in Question Bank and ALL referencing quizzes
 */
export const POST = withAuth(async (req: Request) => {
  try {
    const prepared = await prepareQuestionSyncRequest(await req.json(), connectDB, generateQuestionId, QuestionBank)
    if (!prepared.success) return NextResponse.json({ error: 'Validation failed', details: prepared.issues }, { status: 400 })
    const { category_id, effectiveOldId, newQuestion: new_question, oldQuestion, revision, conflict } = prepared
    if (conflict) return NextResponse.json({ error: 'Question identity conflict; no changes were written' }, { status: 409 })

    if (!oldQuestion) {
      return NextResponse.json({
        error: 'Question not found in bank',
      }, { status: 404 })
    }

    const usedInQuizzes = oldQuestion.used_in_quizzes || []
    const rawUsedInQuizIds = (oldQuestion.used_in_quiz_ids || []).map((id: any) => String(id))

    const filterOr: any[] = []
    if (rawUsedInQuizIds.length > 0) {
      filterOr.push({ _id: { $in: rawUsedInQuizIds } })
    }
    if (usedInQuizzes.length > 0) {
      filterOr.push({ course_code: { $in: usedInQuizzes } })
    }

    const affectedQuizzes = filterOr.length > 0
      ? await Quiz.find({ category_id, $or: filterOr })
      : []

    const synchronization = await planAndPrepareQuestionSynchronization(
      affectedQuizzes, new_question, [effectiveOldId, oldQuestion?.question_id].filter(Boolean), oldQuestion || new_question,
    )
    if (!synchronization.success) return NextResponse.json({ error: 'Question options conflict; no changes were written', quiz_id: synchronization.conflictQuizId }, { status: 409 })
    const { plans } = synchronization
    let updatedQuizCount = 0
    const updatedQuizIds = new Set<string>()
    try {
      await saveSynchronizedQuizzes(plans, id => { updatedQuizCount++; updatedQuizIds.add(id) })
      const finalQuizIds = Array.from(new Set([...rawUsedInQuizIds, ...updatedQuizIds]))
      // Preserve the bank identity so a failed write can be retried without delete/recreate loss.
      await QuestionBank.updateOne({ _id: oldQuestion._id }, { $set: {
        ...revision,
        text: new_question.text,
        options: new_question.options,
        correct_answer: new_question.correct_answer,
        explanation: new_question.explanation ?? oldQuestion.explanation,
        image_url: new_question.image_url ?? oldQuestion.image_url,
        used_in_quiz_ids: finalQuizIds,
        has_conflicts: false,
      } })
    } catch (error) {
      return NextResponse.json({ error: 'Synchronization failed; retry the same request to finish', updated_quiz_ids: Array.from(updatedQuizIds), bank_write_confirmed: false, retry_required: true }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updated_quizzes: updatedQuizCount,
      total_quizzes: affectedQuizzes.length,
      message: `Successfully updated ${updatedQuizCount}/${affectedQuizzes.length} quizzes`,
    })
  } catch (error: any) {
    console.error('Error syncing update:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['admin'] })
