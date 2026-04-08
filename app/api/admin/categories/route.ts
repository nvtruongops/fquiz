import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken, requireRole } from '@/lib/auth'
import { Category } from '@/models/Category'
import { CategoryListQuerySchema, CreateCategorySchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'


export async function GET(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(payload, 'admin')

    const { searchParams } = new URL(req.url)
    
    // Validate query params
    const queryValidation = CategoryListQuerySchema.safeParse({
      ...(searchParams.get('search') !== null && { search: searchParams.get('search') }),
      ...(searchParams.get('min_quizzes') !== null && { min_quizzes: searchParams.get('min_quizzes') }),
      ...(searchParams.get('type') !== null && { type: searchParams.get('type') }),
      ...(searchParams.get('status') !== null && { status: searchParams.get('status') }),
    })

    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryValidation.error.issues },
        { status: 400 }
      )
    }

    const { search, min_quizzes: minQuizzes, type: typeParam, status } = queryValidation.data

    await connectDB()

    const matchStage: any = {}
    
    if (search) {
      matchStage.name = { $regex: search, $options: 'i' }
    }
    
    // For admin moderation/listing screen, default to public categories only.
    // This avoids mixing user-private categories (often same names), which appears as duplicates.
    let effectiveType = typeParam
    if (!effectiveType && (status === 'approved' || status === 'pending')) {
      effectiveType = 'public'
    }

    if (effectiveType && effectiveType !== '') matchStage.type = effectiveType
    if (status && status !== '') matchStage.status = status

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'quizzes',
          let: { categoryId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$category_id', '$$categoryId'] },
              },
            },
            { $count: 'count' },
          ],
          as: 'quizStats',
        },
      },
      {
        $addFields: {
          quizCount: {
            $ifNull: [{ $arrayElemAt: ['$quizStats.count', 0] }, 0],
          },
        },
      },
      {
        $project: {
          quizStats: 0,
        },
      },
      {
        $sort: { created_at: -1 },
      },
    ]

    // Apply minimum quizzes filter if present
    if (minQuizzes > 0) {
      pipeline.push({
        $match: {
          quizCount: { $gte: minQuizzes },
        },
      })
    }

    const categories = await Category.aggregate(pipeline)

    return NextResponse.json({ categories })
  } catch (err) {
    console.error('Error fetching categories:', err)
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

export async function POST(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(payload, 'admin')

    await connectDB()
    
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Validate with schema
    const parsed = CreateCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { name, description, is_public } = parsed.data

    const existing = await Category.findOne({ name })
    if (existing) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 })
    }

    const category = await Category.create({ 
      name, 
      description,
      is_public,
      type: 'public',
      status: 'approved'
    })
    
    return NextResponse.json({ category }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
