import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Feedback } from '@/lib/models/Feedback'
import mongoose from 'mongoose'

export const PUT = withAuth<{ id: string }>(async (req, { params }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID góp ý không hợp lệ' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const { status } = body

  if (!status || !['pending', 'reviewed', 'resolved'].includes(status)) {
    return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 })
  }

  await connectDB()
  const updated = await Feedback.findByIdAndUpdate(id, { status }, { new: true }).lean()
  if (!updated) {
    return NextResponse.json({ error: 'Không tìm thấy thư góp ý' }, { status: 404 })
  }

  return NextResponse.json({ success: true, feedback: updated })
})

export const DELETE = withAuth<{ id: string }>(async (req, { params }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID góp ý không hợp lệ' }, { status: 400 })
  }

  await connectDB()
  const deleted = await Feedback.findByIdAndDelete(id)
  if (!deleted) {
    return NextResponse.json({ error: 'Không tìm thấy thư góp ý' }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: 'Đã xóa góp ý' })
})
