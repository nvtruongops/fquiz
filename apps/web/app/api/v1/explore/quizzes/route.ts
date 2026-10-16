import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { User } from '@/lib/modules/auth/models/User'
import { Category } from '@/lib/modules/quiz/models/Category'
import { verifyToken } from '@/lib/modules/auth/auth'
import { Types } from 'mongoose'

import { getPublicQuizFilter } from '@/lib/modules/quiz/utils/public-quiz-filter'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/explore/quizzes
 * Authenticated version of public quizzes - merges user's session history
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = request.nextUrl
    const sort = searchParams.get('sort') || 'popular'
    const categoryId = searchParams.get('category_id')
    const search = searchParams.get('search')
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10)
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10)

    const query: Record<string, unknown> = {
      ...getPublicQuizFilter(),
    }
    if (categoryId) query.category_id = categoryId
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { course_code: { $regex: escaped, $options: 'i' } },
      ]
    }

    const sortOption: Record<string, 1 | -1> =
      sort === 'popular' ? { studentCount: -1 } : { created_at: -1 }

    const quizzes = await Quiz.find(query)
      .select('title course_code category_id questionCount studentCount created_by created_at')
      .sort(sortOption)
      .skip(offset)
      .limit(limit)
      .lean()

    const creatorIds = Array.from(new Set(quizzes.map((q: any) => q.created_by).filter(Boolean)))
    const categoryIds = Array.from(new Set(quizzes.map((q: any) => q.category_id).filter(Boolean)))

    const [creators, categories] = await Promise.all([
      creatorIds.length > 0 ? User.find({ _id: { $in: creatorIds } }).select('username').lean() : [],
      categoryIds.length > 0 ? Category.find({ _id: { $in: categoryIds } }).select('name').lean() : [],
    ])

    const creatorMap = new Map((creators as any[]).map((c: any) => [c._id.toString(), c.username]))
    const categoryMap = new Map((categories as any[]).map((c: any) => [c._id.toString(), c.name]))

    // Try to get user session data if authenticated
    const sessionMap = new Map<string, { score: number; totalQuestions: number; durationMs: number }>()

    const payload = await verifyToken(request).catch(() => null)
    if (payload?.role === 'student') {
      const userId = new Types.ObjectId(payload.userId)
      const quizIds = quizzes.map((q: any) => q._id)

      const [latestSessions, durations] = await Promise.all([
        QuizSession.aggregate([
          { $match: { student_id: userId, quiz_id: { $in: quizIds }, status: 'completed' } },
          { $sort: { completed_at: -1 } },
          { $group: { _id: '$quiz_id', score: { $first: '$score' } } },
        ]),
        QuizSession.aggregate([
          { $match: { student_id: userId, quiz_id: { $in: quizIds }, status: 'completed' } },
          {
            $group: {
              _id: '$quiz_id',
              totalDurationMs: {
                $sum: { $max: [0, { $subtract: [{ $ifNull: ['$completed_at', '$started_at'] }, '$started_at'] }] },
              },
            },
          },
        ]),
      ])

      const durationMap = new Map(durations.map((d: any) => [d._id.toString(), d.totalDurationMs]))

      for (const s of latestSessions as any[]) {
        const qid = s._id.toString()
        const quiz = quizzes.find((q: any) => q._id.toString() === qid) as any
        const totalQuestions = quiz?.questionCount || 0
        sessionMap.set(qid, {
          score: s.score,
          totalQuestions,
          durationMs: durationMap.get(qid) ?? 0,
        })
      }
    }

    const data = quizzes.map((quiz: any) => {
      const qid = quiz._id.toString()
      const session = sessionMap.get(qid)
      const totalQuestions = quiz.questionCount || 0
      const latestCorrectCount = session?.score ?? null
      const latestScoreOnTen =
        latestCorrectCount !== null && totalQuestions > 0
          ? Number(((latestCorrectCount / totalQuestions) * 10).toFixed(2))
          : null
      const totalStudyMinutes = session ? Math.round(session.durationMs / 60000) : null

      return {
        id: qid,
        title: quiz.title,
        course_code: quiz.course_code,
        source_type: 'explore_public' as const,
        source_label: 'Public Library',
        source_creator_name: quiz.created_by ? creatorMap.get(quiz.created_by.toString()) || null : null,
        questionCount: totalQuestions,
        studentCount: quiz.studentCount || 0,
        categoryId: quiz.category_id ? quiz.category_id.toString() : '',
        categoryName: quiz.category_id ? categoryMap.get(quiz.category_id.toString()) || 'Uncategorized' : 'Uncategorized',
        latestCorrectCount,
        latestTotalCount: latestCorrectCount !== null ? totalQuestions : null,
        latestScoreOnTen,
        totalStudyMinutes,
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching explore quizzes:', error)
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 })
  }
}
