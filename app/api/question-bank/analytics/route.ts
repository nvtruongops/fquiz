import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { QuestionBank } from '@/models/QuestionBank'
import { z } from 'zod'

const AnalyticsSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  page: z.string().optional(),
  per_page: z.string().optional(),
})

/**
 * GET /api/question-bank/analytics
 * Thống kê ngân hàng câu hỏi
 */
export async function GET(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const categoryIdParam = searchParams.get('category_id')
    const pageParam = searchParams.get('page')
    const perPageParam = searchParams.get('per_page')
    
    // Chỉ validate nếu có category_id và không phải empty string
    let category_id: string | undefined = undefined
    let page = 1
    let per_page = 100

    if (categoryIdParam && categoryIdParam.trim() !== '') {
      const parsed = AnalyticsSchema.safeParse({
        category_id: categoryIdParam,
        page: pageParam,
        per_page: perPageParam,
      })

      if (!parsed.success) {
        console.error('Validation error:', parsed.error.issues)
        return NextResponse.json({
          error: 'Validation failed',
          details: parsed.error.issues,
        }, { status: 400 })
      }
      
      category_id = parsed.data.category_id
      page = parsed.data.page ? parseInt(parsed.data.page) : 1
      per_page = parsed.data.per_page ? parseInt(parsed.data.per_page) : 100
    }

    await connectDB()

    const query = category_id ? { category_id } : {}

    // Count total questions
    const totalQuestions = await QuestionBank.countDocuments(query)

    // Get questions list if specific category selected
    let questions: any[] = []
    let total_pages = 0
    
    if (category_id) {
      const skip = (page - 1) * per_page
      total_pages = Math.ceil(totalQuestions / per_page)

      questions = await QuestionBank.find(query)
        .sort({ usage_count: -1, created_at: -1 })
        .skip(skip)
        .limit(per_page)
        .select('text options correct_answer usage_count used_in_quizzes')
        .lean()
    }

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
}
