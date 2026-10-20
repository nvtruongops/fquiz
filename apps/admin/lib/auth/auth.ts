import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { User } from '@/lib/models/User'
import { AUTH_COOKIE_NAME } from '@/lib/constants'

import { decrypt, signTokenWithSecret, type JWTPayload as AuthJWTPayload } from '@fquiz/auth'

export type JWTPayload = AuthJWTPayload
export { decrypt }

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

  try {
    await connectDB()
    const user = await User.findById(jwtPayload.userId).select('token_version status role').lean()
    
    if (!user) return null
    if (user.status !== 'active') return null
    if (user.role !== 'admin') return null
    if (jwtPayload.v === undefined || user.token_version === undefined || user.token_version !== jwtPayload.v) {
      return null
    }

    return jwtPayload
  } catch {
    return null
  }
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
