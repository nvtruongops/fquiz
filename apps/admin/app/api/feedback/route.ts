import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Feedback } from '@/lib/models/Feedback'

export const GET = withAuth(async (req) => {
  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')

  await connectDB()

  const filter: Record<string, any> = {}
  if (type && type !== 'all') filter.type = type
  if (status && status !== 'all') filter.status = status
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [
      { username: { $regex: escaped, $options: 'i' } },
      { user_email: { $regex: escaped, $options: 'i' } },
      { message: { $regex: escaped, $options: 'i' } },
    ]
  }

  const feedbacks = await Feedback.find(filter)
    .sort({ created_at: -1 })
    .limit(100)
    .lean()

  return NextResponse.json({ feedbacks })
})
