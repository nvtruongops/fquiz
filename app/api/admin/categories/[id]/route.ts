import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken, requireRole } from '@/lib/auth'
import { Category } from '@/models/Category'
import { Quiz } from '@/models/Quiz'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(payload, 'admin')

    await connectDB()
    const body = await req.json()
    const { name } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const duplicate = await Category.findOne({ name: name.trim(), _id: { $ne: params.id } })
    if (duplicate) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 })
    }

    const category = await Category.findByIdAndUpdate(
      params.id,
      { name: name.trim() },
      { new: true }
    )
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    return NextResponse.json({ category })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(payload, 'admin')

    await connectDB()

    const quizCount = await Quiz.countDocuments({ category_id: params.id })
    if (quizCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category: it has associated quizzes' },
        { status: 400 }
      )
    }

    const category = await Category.findByIdAndDelete(params.id)
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    return NextResponse.json({ message: 'Deleted' })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
