import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { z } from 'zod'

const AnalyticsSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  page: z.string().optional(),
  per_page: z.string().optional(),
})

function parseAnalyticsParams(searchParams: URLSearchParams) {
  const categoryIdParam = searchParams.get('category_id')
  const pageParam = searchParams.get('page')
  const perPageParam = searchParams.get('per_page')
  const searchParam = searchParams.get('search')
  
  let category_id: string | undefined = undefined
  let page = pageParam ? Number.parseInt(pageParam, 10) : 1
  if (isNaN(page) || page < 1) page = 1

  let per_page = perPageParam ? Number.parseInt(perPageParam, 10) : 100
  if (isNaN(per_page) || per_page < 1) per_page = 100
  if (per_page > 200) per_page = 200

  const search: string | undefined = searchParam && searchParam.trim() !== '' ? searchParam.trim() : undefined

  if (categoryIdParam && categoryIdParam.trim() !== '' && categoryIdParam !== 'all') {
    if (/^[a-f0-9]{24}$/i.test(categoryIdParam)) {
      category_id = categoryIdParam
    } else {
      return { invalidCategory: true, page, per_page, search, category_id: undefined }
    }
  }

  return { invalidCategory: false, page, per_page, search, category_id }
}

async function resolveQuizCourseCodes(questions: any[]) {
  const allQuizIds = questions
    .flatMap((q: any) => q.used_in_quiz_ids || [])
    .filter(Boolean)
  const quizMap = new Map<string, string>()

  if (allQuizIds.length > 0) {
    const quizzes = await Quiz.find({ _id: { $in: allQuizIds } })
      .select('course_code')
      .lean()
    quizzes.forEach((qz: any) => {
      quizMap.set(String(qz._id), qz.course_code)
    })
  }

  return questions.map((q: any) => {
    let resolvedCodes: string[]

    if (q.used_in_quiz_ids && q.used_in_quiz_ids.length > 0) {
      resolvedCodes = q.used_in_quiz_ids
        .map((id: any) => quizMap.get(String(id)))
        .filter(Boolean) as string[]
      resolvedCodes = [...new Set(resolvedCodes)]
    } else {
      resolvedCodes = q.used_in_quizzes || []
    }

    return {
      ...q,
      used_in_quizzes: resolvedCodes,
      usage_count: resolvedCodes.length,
    }
  })
}

/**
 * GET /api/question-bank/analytics
 * Thống kê ngân hàng câu hỏi
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
    const { invalidCategory, page, per_page, search, category_id } = parseAnalyticsParams(searchParams)

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

    const questions = await resolveQuizCourseCodes(rawQuestions)

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