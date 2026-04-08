import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken, requireRole } from '@/lib/auth'
import { Category } from '@/models/Category'
import { Quiz } from '@/models/Quiz'

function isPublicCategory(category: any): boolean {
  if (!category) return false
  if (category.type === 'public') return true
  return category.type == null && category.owner_id == null
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(payload, 'admin')

    await connectDB()
    const body = await req.json()
    const { name } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const duplicate = await Category.findOne({
      name: name.trim(),
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
      { name: name.trim(), type: 'public', owner_id: null, is_public: true },
      { new: true }
    )

    return NextResponse.json({ category })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(payload, 'admin')

    await connectDB()

    const category = await Category.findById(id).lean()
    if (!isPublicCategory(category)) {
      return NextResponse.json({ error: 'Public category not found' }, { status: 404 })
    }

    const hasAnyQuiz = await Quiz.exists({ category_id: category._id })
    if (hasAnyQuiz) {
      return NextResponse.json(
        { error: 'Cannot delete category: it has associated quizzes' },
        { status: 400 }
      )
    }

    await Category.deleteOne({ _id: category._id })

    return NextResponse.json({ message: 'Deleted' })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
