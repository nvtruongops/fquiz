import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { Category } from '@/models/Category'
import { rateLimiter } from '@/lib/rate-limit/provider'
import { logSecurityEvent } from '@/lib/logger'
import { PaginationQuerySchema } from '@/lib/schemas'
import { z } from 'zod'

// Escape special regex characters to prevent ReDoS / injection
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Search-specific query schema
const SearchQueryParamsSchema = PaginationQuerySchema.extend({
  category: z.string().trim().max(100).optional(),
  course_code: z.string().trim().max(50).optional(),
})

export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') || 'unknown'
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const route = '/api/search'

  try {
    const rateLimit = await rateLimiter.check(`search_${ip}`)
    if (!rateLimit.success) {
      logSecurityEvent('rate_limit_triggered', { request_id: requestId, route, outcome: 'denied', ip }, 'Search rate limit reached')
      return NextResponse.json({ error: 'Too many search requests' }, { status: 429 })
    }

    const payload = await verifyToken(req)
    if (!payload || payload.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    
    // Validate query params
    const queryValidation = SearchQueryParamsSchema.safeParse({
      category: searchParams.get('category'),
      course_code: searchParams.get('course_code'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    })

    if (!queryValidation.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters', 
        details: queryValidation.error.issues
      }, { status: 400 })
    }

    const { category, course_code, page, limit } = queryValidation.data

    await connectDB()

    // Build query filter
    const filter: Record<string, unknown> = {}

    if (category) {
      const cat = await Category.findOne({ 
        name: { $regex: escapeRegex(category), $options: 'i' } 
      })
      if (!cat) {
        return NextResponse.json({ quizzes: [], total: 0, page, limit })
      }
      filter.category_id = cat._id
    }

    if (course_code) {
      filter.course_code = { $regex: escapeRegex(course_code), $options: 'i' }
    }

    const skip = (page - 1) * limit
    const [quizzes, total] = await Promise.all([
      Quiz.find(filter, { title: 1, course_code: 1, category_id: 1, questions: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Quiz.countDocuments(filter),
    ])

    const result = quizzes.map((q) => ({
      _id: q._id,
      title: q.title,
      course_code: q.course_code,
      category_id: q.category_id,
      questionCount: Array.isArray(q.questions) ? q.questions.length : 0,
    }))

    return NextResponse.json({ quizzes: result, total, page, limit })
  } catch (err) {
    logSecurityEvent('search_error', { 
      request_id: requestId, 
      user_id: 'unknown', 
      route, 
      outcome: 'error', 
      ip, 
      err: err instanceof Error ? err.message : 'Unknown' 
    }, 'GET /api/search failed')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
