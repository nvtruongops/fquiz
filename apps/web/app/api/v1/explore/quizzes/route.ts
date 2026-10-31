import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { User } from '@/lib/modules/auth/models/User'
import { Category } from '@/lib/modules/quiz/models/Category'
import { verifyToken } from '@/lib/modules/auth/auth'
import {
  buildQuizListingQuery,
  loadExploreSessionMap,
  mapExploreQuizRows,
  parseQuizListingParams,
} from '@/lib/modules/quiz/public-quiz-listing-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/explore/quizzes
 * Authenticated version of public quizzes - merges user's session history
 */
export async function GET(request: NextRequest) {
  try {
    const params = parseQuizListingParams(request.nextUrl.searchParams, 'popular')
    if (!params) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }
    const { limit, offset, search, category_id: categoryId, sort } = params

    await connectDB()

    const query = buildQuizListingQuery(categoryId, search)

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

    const payload = await verifyToken(request).catch(() => null)
    const sessions = await loadExploreSessionMap(quizzes, payload?.role === 'student' ? payload.userId : undefined)
    const data = mapExploreQuizRows(quizzes, creators, categories, sessions)

    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Error fetching explore quizzes:', error)
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 })
  }
}
