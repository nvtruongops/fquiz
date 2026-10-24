import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { verifyToken, signToken, clearUserStatusCache } from '@/lib/modules/auth/auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'

const REFRESH_THRESHOLD_SECONDS = 12 * 60 * 60 // Refresh if < 12h remaining

function getAuthCookieToken(request: Request): string | undefined {
  return request.headers.get('cookie')
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('auth-token='))
    ?.slice('auth-token='.length) || undefined
}

function createUnauthenticatedResponse(request: Request, status = 200): NextResponse {
  const response = NextResponse.json({ user: null }, { status })
  if (getAuthCookieToken(request)) response.cookies.delete('auth-token')
  return response
}

function hasCurrentAuthorization(user: { role: string; token_version?: number }, payload: { role: string; v?: number }) {
  return user.role === payload.role && (payload.v ?? 1) === (user.token_version ?? 1)
}

async function refreshAuthCookieIfNeeded(
  request: Request,
  response: NextResponse,
  payload: { userId: string; role: string },
  user: { username: string; avatar_url?: string | null; avatarUrl?: string | null; token_version?: number }
): Promise<void> {
  try {
    const token = getAuthCookieToken(request)
    if (!token) return

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload: jwtData } = await jwtVerify(token, secret)
    const remaining = (jwtData.exp ?? 0) - Math.floor(Date.now() / 1000)
    if (remaining <= 0 || remaining >= REFRESH_THRESHOLD_SECONDS) return

    const newToken = await signToken(payload.userId, payload.role, user.token_version ?? 1, {
      username: user.username,
      avatarUrl: user.avatar_url ?? user.avatarUrl ?? '',
    })
    const authCookieDomain = process.env.AUTH_COOKIE_DOMAIN
    response.cookies.set('auth-token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
      ...(authCookieDomain ? { domain: authCookieDomain } : {}),
    })
  } catch {
    // Ignore refresh errors - user still gets their data.
  }
}

export async function GET(request: Request) {
  const payload = await verifyToken(request)
  if (!payload) return createUnauthenticatedResponse(request)

  try {
    await connectDB()
    const user = await User.findById(payload.userId).select('username role avatar_url avatarUrl theme_preference themePreference token_version status').lean() as {
      username: string
      role: string
      avatar_url?: string | null
      avatarUrl?: string | null
      theme_preference?: string | null
      themePreference?: string | null
      token_version?: number
      status?: string
    } | null
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // Check if user is banned or pending deletion
    if (user.status === 'banned' || user.status === 'pending_deletion') {
      // Clear auth cookie
      const response = NextResponse.json({ user: null, banned: user.status === 'banned', pending_deletion: user.status === 'pending_deletion' }, { status: 403 })
      response.cookies.delete('auth-token')
      return response
    }

    if (!hasCurrentAuthorization(user, payload)) {
      clearUserStatusCache(payload.userId)
      return createUnauthenticatedResponse(request, 401)
    }

    const avatarUrl = user.avatar_url ?? user.avatarUrl ?? ''
    const themePreference = user.theme_preference ?? user.themePreference ?? 'light'

    const response = NextResponse.json({
      user: {
        _id: payload.userId,
        name: user.username,
        role: user.role,
        avatarUrl,
        themePreference,
      },
    })

    // Sliding session: refresh cookie if token expires in < 12h.
    await refreshAuthCookieIfNeeded(request, response, payload, user)

    return response
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
