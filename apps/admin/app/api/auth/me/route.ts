import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { User } from '@/lib/models/User'

export const GET = withAuth(async (req, { payload }) => {
  await connectDB()
  const user = await User.findById(payload.userId)
    .select('-password_hash -reset_token -reset_token_expires')
    .lean()

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
})
