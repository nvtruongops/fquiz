import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import { verifyToken } from '@/lib/auth'
import { Types } from 'mongoose'
import logger from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Simple in-memory cache for Serverless (Best effort)
const cache: Record<string, { data: any, expiresAt: number }> = {}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('category_id')
  const searchInput = searchParams.get('search') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') ?? '20', 10)))
  const payload = await verifyToken(req)
  const studentUserId = payload?.role === 'student' ? payload.userId : null
  
  // Cache key based on query params
  const cacheScope = studentUserId ? `user-${studentUserId}` : 'anon'
  const cacheKey = `quizzes-${cacheScope}-${categoryId || 'all'}-${searchInput}-${sort}-${page}-${limit}`
  const now = Date.now()
  
  if (cache[cacheKey] && cache[cacheKey].expiresAt > now) {
    return NextResponse.json(cache[cacheKey].data, { headers: { 'X-Cache': 'HIT' } })
  }

  try {
    await connectDB()

    // 1. Build Query with Security - Only original public published quizzes
    const filter: any = { 
      status: 'published',
      is_public: true,
      is_saved_from_explore: { $ne: true }
    }
    
    if (categoryId) {
      filter.category_id = categoryId
    }

    if (searchInput) {
      // Security: Escape regex characters and limit length
      const escapedSearch = searchInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').substring(0, 50)
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { course_code: { $regex: escapedSearch, $options: 'i' } },
      ]
    }

    // 2. Sorting
    let sortOption: any = { created_at: -1 }
    if (sort === 'popular') {
      sortOption = { studentCount: -1, created_at: -1 }
    } else if (sort === 'newest') {
      sortOption = { created_at: -1 }
    }

    // 3. Selective Whitelist Fetching with Population
    const skip = (page - 1) * limit
    const [quizzesRaw, total] = await Promise.all([
      Quiz.find(filter)
        .select('title course_code questionCount studentCount category_id created_at questions created_by')
        .populate('category_id', 'name')
        .populate('created_by', 'username')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Quiz.countDocuments(filter),
    ])

    // 4. Decouple ID and Format Response
    const data = quizzesRaw.map((q: any) => {
      const category = q.category_id as any
      return {
        id: q._id.toString(),
        title: q.title,
        course_code: q.course_code,
        source_type: 'explore_public',
        source_label: 'Từ Explore',
        source_creator_name: q.created_by?.username ?? null,
        questionCount: q.questionCount || (q.questions?.length ?? 0),
        studentCount: q.studentCount || 0,
        categoryId: category?._id?.toString() || q.category_id.toString(),
        categoryName: category?.name || 'Môn học chung',
        createdAt: q.created_at,
      }
    })

    if (studentUserId && data.length > 0) {
      const quizObjectIds = data.map((q) => new Types.ObjectId(q.id))
      const latestSessions = await QuizSession.aggregate([
        {
          $match: {
            student_id: new Types.ObjectId(studentUserId),
            status: 'completed',
            quiz_id: { $in: quizObjectIds },
          },
        },
        { $sort: { completed_at: -1 } },
        {
          $group: {
            _id: '$quiz_id',
            latestSession: { $first: '$$ROOT' },
          },
        },
        { $replaceRoot: { newRoot: '$latestSession' } },
      ])

      const durationByQuiz = await QuizSession.aggregate([
        {
          $match: {
            student_id: new Types.ObjectId(studentUserId),
            status: 'completed',
            quiz_id: { $in: quizObjectIds },
          },
        },
        {
          $group: {
            _id: '$quiz_id',
            totalDurationMs: {
              $sum: {
                $max: [
                  0,
                  {
                    $subtract: [
                      { $ifNull: ['$completed_at', '$started_at'] },
                      '$started_at',
                    ],
                  },
                ],
              },
            },
          },
        },
      ])

      const latestByQuizId = new Map<string, any>()
      for (const session of latestSessions) {
        latestByQuizId.set(session.quiz_id.toString(), session)
      }

      const durationByQuizId = new Map<string, number>()
      for (const item of durationByQuiz) {
        durationByQuizId.set(item._id.toString(), Number(item.totalDurationMs ?? 0))
      }

      for (const quiz of data as any[]) {
        const latest = latestByQuizId.get(quiz.id)
        const totalDurationMs = durationByQuizId.get(quiz.id) ?? 0
        quiz.totalStudyMinutes = Math.round(totalDurationMs / (60 * 1000))

        if (!latest) {
          quiz.latestCorrectCount = null
          quiz.latestTotalCount = quiz.questionCount
          quiz.latestScoreOnTen = null
          continue
        }

        const latestCorrectCount = typeof latest.score === 'number' ? latest.score : 0
        const latestTotalCount = Number(quiz.questionCount || 0)
        const latestScoreOnTen = latestTotalCount > 0
          ? Number(((latestCorrectCount / latestTotalCount) * 10).toFixed(2))
          : 0

        quiz.latestCorrectCount = latestCorrectCount
        quiz.latestTotalCount = latestTotalCount
        quiz.latestScoreOnTen = latestScoreOnTen
      }
    }

    const responseData = {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }

    // 5. Update Cache (60s TTL)
    cache[cacheKey] = {
      data: responseData,
      expiresAt: now + 60 * 1000,
    }

    return NextResponse.json(responseData, { headers: { 'X-Cache': 'MISS' } })
  } catch (err) {
    logger.error({ err }, 'Public Quizzes List API Error')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
