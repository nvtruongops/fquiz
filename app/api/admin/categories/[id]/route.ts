import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Category } from '@/lib/modules/quiz/models/Category'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'

function isPublicCategory(category: any): boolean {
  if (!category) return false
  if (category.type === 'public') return true
  return category.type == null && category.owner_id == null
}

export const PUT = withAuth(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    await connectDB()
    const body = await req.json()
    const { name } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid category id' }, { status: 400 })
    }

    const trimmedName = name.trim()
    const escaped = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const duplicate = await Category.findOne({
      name: { $regex: `^${escaped}$`, $options: 'i' },
      _id: { $ne: id },
      $or: [
        { type: 'public' },
        { type: { $exists: false }, owner_id: null },
      ],
    })
    if (duplicate) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 })
    }

    const existing = await Category.findById(id)
    if (!isPublicCategory(existing)) {
      return NextResponse.json({ error: 'Public category not found' }, { status: 404 })
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { name: trimmedName, type: 'public', owner_id: null, is_public: true },
      { new: true }
    )

    // Revalidate admin pages and explore to show updated category
    revalidateTag('categories', 'default')
    revalidatePath('/admin/categories')
    revalidatePath('/admin/quizzes/new')
    revalidatePath('/explore')

    return NextResponse.json({ category })
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 })
    }
    console.error('PUT /api/admin/categories/[id] error:', err)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}, { roles: ['admin'] })

export const DELETE = withAuth(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid category id' }, { status: 400 })
    }

    await connectDB()

    const category = await Category.findById(id).lean()
    if (!isPublicCategory(category)) {
      return NextResponse.json({ error: 'Public category not found' }, { status: 404 })
    }

    const categoryNameEscaped = category.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const [hasQuiz, hasQuestionBank, hasCourseCode, hasMixConfig] = await Promise.all([
      Quiz.exists({ category_id: category._id }),
      QuestionBank.exists({ category_id: category._id }),
      Quiz.exists({ course_code: { $regex: `^${categoryNameEscaped}$`, $options: 'i' } }),
      Quiz.exists({ 'mix_config.category_id': category._id }),
    ])

    if (hasQuiz || hasQuestionBank || hasCourseCode || hasMixConfig) {
      return NextResponse.json(
        { error: 'Không thể xóa danh mục: Danh mục hiện đang chứa bài quiz hoặc ngân hàng câu hỏi.' },
        { status: 400 }
      )
    }

    await Category.deleteOne({ _id: category._id })

    // Revalidate admin pages and explore to remove deleted category
    revalidateTag('categories', 'default')
    revalidatePath('/admin/categories')
    revalidatePath('/admin/quizzes/new')
    revalidatePath('/explore')

    return NextResponse.json({ message: 'Deleted' })
  } catch (err) {
    console.error('DELETE /api/admin/categories/[id] error:', err)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}, { roles: ['admin'] })