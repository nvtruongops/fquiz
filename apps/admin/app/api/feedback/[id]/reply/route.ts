import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Feedback } from '@/lib/models/Feedback'
import mongoose from 'mongoose'

export const POST = withAuth<{ id: string }>(async (req, { params }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID góp ý không hợp lệ' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const { reply_message } = body

  if (!reply_message || typeof reply_message !== 'string' || !reply_message.trim()) {
    return NextResponse.json({ error: 'Nội dung phản hồi không được để trống' }, { status: 400 })
  }

  await connectDB()
  const updated = await Feedback.findByIdAndUpdate(
    id,
    {
      reply_message: reply_message.trim(),
      replied_at: new Date(),
      status: 'resolved',
    },
    { new: true }
  ).lean()

  if (!updated) {
    return NextResponse.json({ error: 'Không tìm thấy thư góp ý' }, { status: 404 })
  }

  return NextResponse.json({ success: true, feedback: updated })
})
