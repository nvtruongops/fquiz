import { OffsetQuizzesQuerySchema } from '@fquiz/models/schemas'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { getPublicQuizFilter } from '@/lib/modules/quiz/utils/public-quiz-filter'
import { Types } from 'mongoose'

export function parseQuizListingParams(searchParams: URLSearchParams, defaultSort: string) {
  const parsed = OffsetQuizzesQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    category_id: searchParams.get('category_id') ?? undefined,
  })
  return parsed.success
    ? { ...parsed.data, sort: searchParams.get('sort') || defaultSort }
    : null
}

export function buildQuizListingQuery(categoryId?: string, search?: string) {
  const query: Record<string, unknown> = { ...getPublicQuizFilter() }
  if (categoryId) query.category_id = categoryId
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { course_code: { $regex: escaped, $options: 'i' } },
    ]
  }
  return query
}

export function mapPublicQuizRows(quizzes: any[], creators: any[], categories: any[]) {
  const creatorMap = new Map(creators.map(c => [c._id.toString(), c.username]))
  const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name]))
  return quizzes.map(quiz => {
    const id = quiz._id.toString()
    const categoryId = quiz.category_id?.toString() ?? ''
    return {
      id,
      title: quiz.title,
      course_code: quiz.course_code,
      source_type: 'explore_public' as const,
      source_label: 'Public Library',
      source_creator_name: quiz.created_by ? creatorMap.get(quiz.created_by.toString()) ?? null : null,
      questionCount: quiz.questionCount,
      studentCount: quiz.studentCount || 0,
      categoryId,
      categoryName: categoryMap.get(categoryId) ?? 'Uncategorized',
      latestCorrectCount: null,
      latestTotalCount: null,
      latestScoreOnTen: null,
      totalStudyMinutes: null,
    }
  })
}

export async function loadExploreSessionMap(quizzes: any[], userId?: string) {
  const sessionMap = new Map<string, { score: number; totalQuestions: number; durationMs: number }>()
  if (!userId || quizzes.length === 0) return sessionMap

  const studentId = new Types.ObjectId(userId)
  const quizIds = quizzes.map(q => q._id)
  const [latestSessions, durations] = await Promise.all([
    QuizSession.aggregate([
      { $match: { student_id: studentId, quiz_id: { $in: quizIds }, status: 'completed' } },
      { $sort: { completed_at: -1 } },
      { $group: { _id: '$quiz_id', score: { $first: '$score' } } },
    ]),
    QuizSession.aggregate([
      { $match: { student_id: studentId, quiz_id: { $in: quizIds }, status: 'completed' } },
      { $group: {
        _id: '$quiz_id',
        totalDurationMs: {
          $sum: { $max: [0, { $subtract: [{ $ifNull: ['$completed_at', '$started_at'] }, '$started_at'] }] },
        },
      } },
    ]),
  ])
  const durationMap = new Map(durations.map((d: any) => [d._id.toString(), d.totalDurationMs]))
  const quizMap = new Map(quizzes.map(q => [q._id.toString(), q]))
  for (const session of latestSessions) {
    const id = session._id.toString()
    sessionMap.set(id, {
      score: session.score,
      totalQuestions: quizMap.get(id)?.questionCount || 0,
      durationMs: durationMap.get(id) ?? 0,
    })
  }
  return sessionMap
}

export function mapExploreQuizRows(quizzes: any[], creators: any[], categories: any[], sessions: Map<string, { score: number; totalQuestions: number; durationMs: number }>) {
  const creatorMap = new Map(creators.map((c: any) => [c._id.toString(), c.username]))
  const categoryMap = new Map(categories.map((c: any) => [c._id.toString(), c.name]))
  return quizzes.map((quiz: any) => {
    const id = quiz._id.toString()
    const session = sessions.get(id)
    const totalQuestions = quiz.questionCount || 0
    const score = session?.score ?? null
    return {
      id,
      title: quiz.title,
      course_code: quiz.course_code,
      source_type: 'explore_public' as const,
      source_label: 'Public Library',
      source_creator_name: quiz.created_by ? creatorMap.get(quiz.created_by.toString()) ?? null : null,
      questionCount: totalQuestions,
      studentCount: quiz.studentCount || 0,
      categoryId: quiz.category_id ? quiz.category_id.toString() : '',
      categoryName: quiz.category_id ? categoryMap.get(quiz.category_id.toString()) || 'Uncategorized' : 'Uncategorized',
      latestCorrectCount: score,
      latestTotalCount: score !== null ? totalQuestions : null,
      latestScoreOnTen: score !== null && totalQuestions > 0 ? Number(((score / totalQuestions) * 10).toFixed(2)) : null,
      totalStudyMinutes: session ? Math.round(session.durationMs / 60000) : null,
    }
  })
}
