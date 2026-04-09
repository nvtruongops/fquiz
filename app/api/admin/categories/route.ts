import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { connectDB } from '@/lib/mongodb'
import { verifyToken, requireRole } from '@/lib/auth'
import { Category } from '@/models/Category'
import { Quiz } from '@/models/Quiz'
import { CategoryListQuerySchema, CreateCategorySchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

const publicCategoryMatch = {
  $or: [
    { type: 'public' },
    { type: { $exists: false }, owner_id: null },
  ],
}

function buildCategoryMatchFilter(search?: string, typeParam?: 'public' | 'private' | '', status?: 'pending' | 'approved' | 'rejected' | '') {
  const filter: Record<string, unknown> = {}

  if (search) {
    filter.name = { $regex: search, $options: 'i' }
  }

  const effectiveType = typeParam || 'public'
  if (effectiveType === 'public') {
    Object.assign(filter, publicCategoryMatch)
  } else {
    filter.type = effectiveType
  }

  if (status) {
    filter.status = status
  }

  return filter
}

async function attachQuizCounts(categories: any[]) {
  if (categories.length === 0) return []

  const categoryIds = categories.map((c) => c._id)
  const grouped = await Quiz.aggregate([
    { $match: { category_id: { $in: categoryIds } } },
    { $group: { _id: '$category_id', quizCount: { $sum: 1 } } },
  ])

  const countMap = new Map<string, number>(
    grouped.map((item: { _id: any; quizCount: number }) => [String(item._id), item.quizCount])
  )

  return categories.map((category) => ({
    ...category,
    quizCount: countMap.get(String(category._id)) ?? 0,
  }))
}


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

    const matchFilter = buildCategoryMatchFilter(search, typeParam, status)
    const categoriesRaw = await Category.find(matchFilter).sort({ created_at: -1 }).lean()
    const categoriesWithCount = await attachQuizCounts(categoriesRaw)

    const categories = minQuizzes > 0
      ? categoriesWithCount.filter((c) => c.quizCount >= minQuizzes)
      : categoriesWithCount

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

    const { name, description } = parsed.data

    const existing = await Category.findOne({ name, ...publicCategoryMatch })
    if (existing) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 })
    }

    const category = await Category.create({ 
      name, 
      description,
      owner_id: null,
      is_public: true,
      type: 'public',
      status: 'approved'
    })
    
    // Revalidate admin pages to show new category immediately
    revalidatePath('/admin/categories')
    revalidatePath('/admin/quizzes/new')
    
    return NextResponse.json({ category }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
