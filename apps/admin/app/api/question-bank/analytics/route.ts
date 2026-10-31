import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { QuestionBank } from '@/lib/models/QuestionBank'
import { Quiz } from '@/lib/models/Quiz'
import { parseQuestionBankAnalyticsParams, resolveQuestionBankQuestions } from '@fquiz/models'

export const GET = withAuth(async (req) => {
  try {
    const url = new URL(req.url)
    const { invalidCategory, page, per_page, search, category_id } = parseQuestionBankAnalyticsParams(url.searchParams)

    if (invalidCategory) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 })
    }

    await connectDB()

    const filter: Record<string, any> = {}
    if (category_id) {
      filter.category_id = category_id
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const searchRegex = { $regex: escaped, $options: 'i' }

      const matchingQuizzes = await Quiz.find({ course_code: searchRegex })
        .select('_id')
        .lean()
      const matchingQuizIds = matchingQuizzes.map((q) => q._id)

      filter.$or = [
        { text: searchRegex },
        { options: searchRegex },
        { used_in_quizzes: searchRegex },
        ...(matchingQuizIds.length > 0
          ? [{ used_in_quiz_ids: { $in: matchingQuizIds } }]
          : []),
      ]
    }

    const total_questions = await QuestionBank.countDocuments(filter)
    const total_pages = Math.ceil(total_questions / per_page) || 1

    const rawQuestions = await QuestionBank.find(filter)
      .sort({ usage_count: -1, _id: -1 })
      .skip((page - 1) * per_page)
      .limit(per_page)
      .lean()

    const questionsWithUsage = await resolveQuestionBankQuestions(rawQuestions, Quiz)
    const questions = questionsWithUsage.map(q => ({
      _id: String(q._id),
      text: q.text,
      options: q.options,
      correct_answer: q.correct_answer,
      usage_count: q.usage_count,
      used_in_quizzes: q.used_in_quizzes,
    }))

    return NextResponse.json({
      total_questions,
      page,
      per_page,
      total_pages,
      questions,
    })
  } catch (error) {
    console.error('Error fetching question bank analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
})
