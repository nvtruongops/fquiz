import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { parseQuestionBankAnalyticsParams, resolveQuestionBankQuestions } from '@fquiz/models'

/**
 * GET /api/question-bank/analytics
 * Question bank analytics and statistics
 */
export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const { invalidCategory, page, per_page, search, category_id } = parseQuestionBankAnalyticsParams(searchParams)

    if (invalidCategory) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 })
    }

    await connectDB()

    const query: any = {}
    if (category_id) {
      query.category_id = category_id
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const searchRegex = { $regex: escaped, $options: 'i' }
      query.$or = [
        { text: searchRegex },
        { options: searchRegex },
        { used_in_quizzes: searchRegex },
      ]
    }

    const totalQuestions = await QuestionBank.countDocuments(query)
    const skip = (page - 1) * per_page
    const total_pages = Math.ceil(totalQuestions / per_page) || 1

    const rawQuestions = await QuestionBank.find(query)
      .sort({ usage_count: -1, created_at: -1 })
      .skip(skip)
      .limit(per_page)
      .select('text options correct_answer usage_count used_in_quizzes used_in_quiz_ids category_id')
      .lean()

    const questions = await resolveQuestionBankQuestions(rawQuestions, Quiz)

    return NextResponse.json({
      total_questions: totalQuestions,
      questions,
      page,
      per_page,
      total_pages,
    })
  } catch (error: any) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['admin'] })
