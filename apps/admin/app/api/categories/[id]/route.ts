import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Category } from '@/lib/models/Category'
import { Quiz } from '@/lib/models/Quiz'
import mongoose from 'mongoose'

export const PUT = withAuth<{ id: string }>(async (req, { params }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const { name } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Invalid category name' }, { status: 400 })
  }

  await connectDB()
  const updated = await Category.findByIdAndUpdate(
    id,
    { name: name.trim(), updated_at: new Date() },
    { new: true }
  ).lean()

  if (!updated) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, category: updated })
})

export const DELETE = withAuth<{ id: string }>(async (req, { params }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 })
  }

  await connectDB()

  // Check if any quiz is linked to this category
  const linkedQuizzes = await Quiz.countDocuments({ category_id: id })
  if (linkedQuizzes > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${linkedQuizzes} quizzes still belong to this category` },
      { status: 400 }
    )
  }

  const deleted = await Category.findByIdAndDelete(id)
  if (!deleted) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: 'Category deleted successfully' })
})
