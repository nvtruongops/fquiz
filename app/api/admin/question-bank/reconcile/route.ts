import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { rebuildQuestionBankUsage } from '@/lib/modules/quiz/question-bank-manager'

/**
 * POST /api/admin/question-bank/reconcile
 * Admin endpoint to rebuild and reconcile QuestionBank usage cache
 * directly from the Quiz collection (Single Source of Truth).
 */
export const POST = withAuth(async () => {
  try {
    await connectDB()
    const result = await rebuildQuestionBankUsage()
    return NextResponse.json({
      success: true,
      message: 'QuestionBank cache reconciled successfully from public quizzes.',
      ...result,
    })
  } catch (err) {
    console.error('POST /api/admin/question-bank/reconcile error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['admin'] })
