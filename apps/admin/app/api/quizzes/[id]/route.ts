import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Quiz } from '@/lib/models/Quiz'
import mongoose from 'mongoose'

export const GET = withAuth<{ id: string }>(async (_req, { params }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID đề thi không hợp lệ' }, { status: 400 })
  }

  await connectDB()
  const quiz = await Quiz.findById(id).lean()
  if (!quiz) {
    return NextResponse.json({ error: 'Không tìm thấy đề thi' }, { status: 404 })
  }

  return NextResponse.json({ quiz })
})

export const PUT = withAuth<{ id: string }>(async (req, { params }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID đề thi không hợp lệ' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const { status, title, is_public } = body

  const update: Record<string, any> = { updated_at: new Date() }
  if (status && ['draft', 'published', 'archived', 'deleted'].includes(status)) {
    update.status = status
  }
  if (title && typeof title === 'string' && title.trim()) {
    update.title = title.trim()
  }
  if (typeof is_public === 'boolean') {
    update.is_public = is_public
  }

  await connectDB()
  const quiz = await Quiz.findByIdAndUpdate(id, update, { new: true }).lean()
  if (!quiz) {
    return NextResponse.json({ error: 'Không tìm thấy đề thi' }, { status: 404 })
  }

  return NextResponse.json({ success: true, quiz })
})

export const DELETE = withAuth<{ id: string }>(async (req, { params }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID đề thi không hợp lệ' }, { status: 400 })
  }

  await connectDB()
  const deleted = await Quiz.findByIdAndDelete(id)
  if (!deleted) {
    return NextResponse.json({ error: 'Không tìm thấy đề thi' }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: 'Đã xóa đề thi' })
})
