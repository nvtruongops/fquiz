import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Category } from '@/lib/models/Category'

export const GET = withAuth(async () => {
  await connectDB()
  const categories = await Category.find({ type: 'public' })
    .sort({ name: 1 })
    .lean()

  return NextResponse.json({ categories })
})

export const POST = withAuth(async (req, { payload }) => {
  const body = await req.json().catch(() => ({}))
  const { name } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Tên danh mục không được để trống' }, { status: 400 })
  }

  await connectDB()

  const trimmed = name.trim()
  const existing = await Category.findOne({ name: { $regex: `^${trimmed}$`, $options: 'i' } })
  if (existing) {
    return NextResponse.json({ error: 'Danh mục đã tồn tại' }, { status: 409 })
  }

  const category = await Category.create({
    name: trimmed,
    type: 'public',
    status: 'approved',
    owner_id: payload.userId,
  })

  return NextResponse.json({ success: true, category }, { status: 201 })
})
