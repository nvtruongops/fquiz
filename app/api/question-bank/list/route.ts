import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { QuestionBank } from '@/models/QuestionBank'
import { z } from 'zod'

const ListQuestionsSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  sort: z.enum(['popular', 'recent']).optional().default('popular'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
})

/**
 * GET /api/question-bank/list
 * Lấy danh sách câu hỏi từ ngân hàng môn học
 */
export async function GET(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const parsed = ListQuestionsSchema.safeParse({
      category_id: searchParams.get('category_id'),
      sort: searchParams.get('sort'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
    })

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.issues,
      }, { status: 400 })
    }

    const { category_id, sort, limit, search } = parsed.data

    await connectDB()

    // Build query
    const query: any = { category_id }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.text = { $regex: escaped, $options: 'i' }
    }

    // Build sort
    const sortOptions: any = sort === 'popular'
      ? { usage_count: -1, created_at: -1 }
      : { created_at: -1 }

    const questions = await QuestionBank.find(query)
      .sort(sortOptions)
      .limit(limit)
      .lean()

    return NextResponse.json({
      questions,
      total: questions.length,
    })
  } catch (error: any) {
    console.error('Error listing question bank:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
