import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { QuestionBank } from '@/lib/models/QuestionBank'
import { Quiz } from '@/lib/models/Quiz'

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

  const search = searchParam && searchParam.trim() !== '' ? searchParam.trim() : undefined

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
    } else {
      resolvedCodes = q.used_in_quizzes || []
    }

    return {
      _id: String(q._id),
      text: q.text,
      options: q.options,
      correct_answer: q.correct_answer,
      usage_count: q.usage_count,
      used_in_quizzes: resolvedCodes,
    }
  })
}

export const GET = withAuth(async (req) => {
  try {
    const url = new URL(req.url)
    const { invalidCategory, page, per_page, search, category_id } = parseAnalyticsParams(url.searchParams)

    if (invalidCategory) {
      return NextResponse.json({ error: 'Mã môn học không hợp lệ' }, { status: 400 })
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

    const questions = await resolveQuizCourseCodes(rawQuestions)

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
