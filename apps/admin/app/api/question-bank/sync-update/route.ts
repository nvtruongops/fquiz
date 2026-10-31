import { planAndPrepareQuestionSynchronization, prepareQuestionSyncRequest, saveSynchronizedQuizzes } from '@fquiz/models'
import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Quiz } from '@/lib/models/Quiz'
import { QuestionBank } from '@/lib/models/QuestionBank'
import { generateQuestionId } from '@/lib/utils/question-id'


export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    const prepared = await prepareQuestionSyncRequest(await req.json(), connectDB, generateQuestionId, QuestionBank)
    if (!prepared.success) return NextResponse.json({ error: 'Validation failed', details: prepared.issues }, { status: 400 })
    const { category_id, effectiveOldId, newQuestion: new_question, oldQuestion, revision, conflict } = prepared
    if (conflict) return NextResponse.json({ error: 'Question identity conflict; no changes were written' }, { status: 409 })

    if (!oldQuestion && !mongoose.Types.ObjectId.isValid(payload.userId || '')) return NextResponse.json({ error: 'A valid creator is required before synchronization' }, { status: 400 })

    const categoryObjectId = new mongoose.Types.ObjectId(category_id)
    const quizzes = await Quiz.find({
      category_id: categoryObjectId,
      status: { $ne: 'deleted' },
      is_temp: { $ne: true },
    })

    const synchronization = await planAndPrepareQuestionSynchronization(
      quizzes, new_question, [effectiveOldId, oldQuestion?.question_id].filter(Boolean), oldQuestion || new_question,
    )
    if (!synchronization.success) return NextResponse.json({ error: 'Question options conflict; no changes were written', quiz_id: synchronization.conflictQuizId }, { status: 409 })
    const { plans } = synchronization
    let updatedQuizCount = 0
    const updatedQuizIds: string[] = []
    try {
      await saveSynchronizedQuizzes(plans, id => { updatedQuizCount++; updatedQuizIds.push(id) })
      if (oldQuestion) {
        await QuestionBank.updateOne(
          { _id: oldQuestion._id },
          {
            $set: {
              ...revision,
              text: new_question.text,
              options: new_question.options,
              correct_answer: new_question.correct_answer,
              explanation: new_question.explanation || oldQuestion.explanation,
              image_url: new_question.image_url || oldQuestion.image_url,
              has_conflicts: false,
            },
          }
        )
      } else {
        await QuestionBank.create({
          category_id: categoryObjectId,
          ...revision,
          text: new_question.text,
          options: new_question.options,
          correct_answer: new_question.correct_answer,
          explanation: new_question.explanation || '',
          image_url: new_question.image_url || '',
          has_conflicts: false,
          created_by: payload.userId,
        })
      }
    } catch (error) {
      return NextResponse.json({ error: 'Synchronization failed; retry the same request to finish', updated_quiz_ids: updatedQuizIds, bank_write_confirmed: false, retry_required: true }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updated_quizzes: updatedQuizCount,
      message: `Successfully synchronized and updated ${updatedQuizCount} quizzes in question bank`,
    })
  } catch (error: any) {
    console.error('Error syncing update:', error)
    return NextResponse.json({ error: error.message || 'Failed to synchronize question bank' }, { status: 500 })
  }
}, { roles: ['admin'] })
