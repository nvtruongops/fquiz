import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { verifyToken, signToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

const REFRESH_THRESHOLD_SECONDS = 12 * 60 * 60 // Refresh if < 12h remaining

export async function GET(request: Request) {
  const payload = await verifyToken(request)
  if (!payload) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  try {
    await connectDB()
    const user = await User.findById(payload.userId).select('username role avatar_url avatarUrl token_version status').lean() as {
      username: string
      role: string
      avatar_url?: string | null
      avatarUrl?: string | null
      token_version?: number
      status?: string
    } | null
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // Check if user is banned
    if (user.status === 'banned') {
      // Clear auth cookie
      const response = NextResponse.json({ user: null, banned: true }, { status: 403 })
      response.cookies.delete('auth-token')
      return response
    }

    const avatarUrl = user.avatar_url ?? user.avatarUrl ?? ''

    const response = NextResponse.json({
      user: {
        name: user.username,
        role: user.role,
        avatarUrl,
      },
    })

    // Sliding session: refresh cookie if token expires in < 12h
    try {
      const cookieHeader = request.headers.get('cookie') || ''
      const token = cookieHeader.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1]
      if (token) {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET)
        const { payload: jwtData } = await jwtVerify(token, secret)
        const exp = jwtData.exp ?? 0
        const now = Math.floor(Date.now() / 1000)
        const remaining = exp - now

        if (remaining > 0 && remaining < REFRESH_THRESHOLD_SECONDS) {
          const newToken = await signToken(payload.userId, payload.role, user.token_version ?? 1, {
            username: user.username,
            avatarUrl: user.avatar_url ?? user.avatarUrl ?? '',
          })
          const authCookieDomain = process.env.AUTH_COOKIE_DOMAIN
          const cookieOpts = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict' as const,
            maxAge: 60 * 60 * 24,
            path: '/',
            ...(authCookieDomain ? { domain: authCookieDomain } : {}),
          }
          response.cookies.set('auth-token', newToken, cookieOpts)
        }
      }
    } catch {
      // Ignore refresh errors - user still gets their data
    }

    return response
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
