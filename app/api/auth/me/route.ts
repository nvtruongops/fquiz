import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

export async function GET(request: Request) {
  const payload = await verifyToken(request)
  if (!payload) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  try {
    await connectDB()
    const user = await User.findById(payload.userId).select('username role avatar_url avatarUrl').lean() as {
      username: string
      role: string
      avatar_url?: string | null
      avatarUrl?: string | null
    } | null
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const avatarUrl = user.avatar_url ?? user.avatarUrl ?? ''

    return NextResponse.json({
      user: {
        name: user.username,
        role: user.role,
        avatarUrl,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
