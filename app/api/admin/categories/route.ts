import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Category, PUBLIC_CATEGORY_MATCH } from '@/lib/modules/quiz/models/Category'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { CategoryListQuerySchema } from '@/lib/core/schemas/common'
import { CreateCategorySchema } from '@/lib/modules/quiz/schemas/category'

export const dynamic = 'force-dynamic'

const publicCategoryMatch = PUBLIC_CATEGORY_MATCH

function buildCategoryMatchFilter(search?: string, typeParam?: 'public' | 'private' | '', status?: 'pending' | 'approved' | 'rejected' | '') {
  const filter: Record<string, unknown> = {}

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.name = { $regex: escaped, $options: 'i' }
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


export const GET = withAuth(async (req: Request, { payload }) => {
  try {
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
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}, { roles: ['admin'] })

export const POST = withAuth(async (req: Request, { payload }) => {
  try {
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
    
    // Revalidate admin pages and explore to show new category immediately
    revalidatePath('/admin/categories')
    revalidatePath('/admin/quizzes/new')
    revalidatePath('/explore')
    
    return NextResponse.json({ category }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}, { roles: ['admin'] })