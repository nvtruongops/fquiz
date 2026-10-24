import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { User } from '@/lib/models/User'
import { AUTH_COOKIE_NAME } from '@/lib/constants'

import { decrypt, signTokenWithSecret, type JWTPayload as AuthJWTPayload } from '@fquiz/auth'

export type JWTPayload = AuthJWTPayload
export { decrypt }

export async function isActiveAdminToken(payload: JWTPayload): Promise<boolean> {
  if (!payload.userId || payload.role !== 'admin' || !isValidTokenVersion(payload.v)) return false

  try {
    await connectDB()
    const user = await User.findById(payload.userId).select('token_version status role').lean()

    return Boolean(
      user &&
      user.status === 'active' &&
      user.role === 'admin' &&
      user.token_version === payload.v
    )
  } catch {
    return false
  }
}

export async function verifyAdminToken(req?: Request): Promise<JWTPayload | null> {
  // Verify the request credential directly, even when the proxy added identity headers.
  let token: string | undefined

  if (req) {
    const cookieHeader = req.headers.get('Cookie') || req.headers.get('cookie') || ''
    const cookieMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`))
    if (cookieMatch) {
      token = decodeURIComponent(cookieMatch[1].trim())
    }

    if (!token) {
      const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || ''
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim()
      }
    }
  }

  // Fallback to Next.js cookies() API
  if (!token) {
    try {
      const cookieStore = await cookies()
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value || cookieStore.get('auth-token')?.value || cookieStore.get('token')?.value
    } catch {
      // Ignore if outside request context
    }
  }

  if (!token) return null

  const jwtPayload = await decrypt(token)
  if (!jwtPayload) return null

  if (jwtPayload.role !== 'admin') {
    return null
  }

  if (!(await isActiveAdminToken(jwtPayload))) return null
  return jwtPayload
}

function isValidTokenVersion(version: unknown): version is number {
  return typeof version === 'number' && Number.isInteger(version) && version >= 1
}

export async function signAdminToken(
  userId: string,
  role: string,
  v: number = 1,
  meta?: { username?: string; avatarUrl?: string }
): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) throw new Error('JWT_SECRET is required to sign admin tokens')
  return signTokenWithSecret(jwtSecret, userId, role, v, meta)
}
