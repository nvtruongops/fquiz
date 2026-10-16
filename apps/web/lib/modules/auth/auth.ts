import { SignJWT } from 'jose'
import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'
import { logJWTVerificationFailed, logSecurityEvent } from '@/lib/core/utils/logger'
import { JWT_EXPIRY } from '@/lib/core/constants'
import { decrypt, checkRole, type JWTPayload as AuthJWTPayload } from '@fquiz/auth'

export type JWTPayload = AuthJWTPayload
export { decrypt, checkRole }

// Short-lived cache for token_version and status to reduce DB load
const userStatusCache = new Map<string, { version: number; status: string; expires: number }>()
const CACHE_TTL = 60 * 1000 // 60 seconds

/**
 * Clear user status cache - call this when admin bans/unbans a user
 */
export function clearUserStatusCache(userId: string): void {
  userStatusCache.delete(userId)
}

async function checkUserSession(userId: string, version?: number): Promise<boolean> {
  const now = Date.now()
  const cached = userStatusCache.get(userId)

  if (cached && cached.expires > now) {
    return cached.status === 'active' && (version === undefined || cached.version === version)
  }

  try {
    await connectDB()
    const user = await User.findById(userId).select('token_version status').lean()
    
    if (!user) {
      if (process.env.NODE_ENV !== 'production' || process.env.PLAYWRIGHT_TEST === '1' || process.env.CI) {
        return true
      }
      return false
    }

    userStatusCache.set(userId, {
      version: user.token_version || 1,
      status: user.status,
      expires: now + CACHE_TTL
    })

    return user.status === 'active' && (version === undefined || (user.token_version || 1) === version)
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' || process.env.PLAYWRIGHT_TEST === '1' || process.env.CI) {
      return true
    }
    console.error('[checkUserSession] DB Error:', err)
    return false // Fail closed on DB error
  }
}


export async function verifyToken(req: Request): Promise<JWTPayload | null> {
  // Prefer cookie, fall back to Authorization Bearer header
  const cookieHeader = req.headers.get('Cookie') || req.headers.get('cookie') || ''
  let token = cookieHeader.split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  if (!token) {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || ''
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    }
  }

  if (!token) return null

  const jwtPayload = await decrypt(token)
  if (!jwtPayload) return null

  try {
    // Enforce session revocation and status check
    const isValid = await checkUserSession(jwtPayload.userId, jwtPayload.v)
    if (!isValid) {
      logSecurityEvent('token_revoked_or_invalid', {
        request_id: req.headers.get('x-request-id') || 'unknown',
        user_id: jwtPayload.userId,
        route: new URL(req.url).pathname,
        outcome: 'failure'
      }, 'JWT version mismatch or user inactive')
      return null
    }

    return jwtPayload
  } catch (err) {
    const requestId = req.headers.get('x-request-id') || 'unknown'
    logJWTVerificationFailed(
      { request_id: requestId, route: new URL(req.url).pathname, outcome: 'failure' },
      err instanceof Error ? err.message : 'Unknown error'
    )
    return null
  }
}

export async function signToken(userId: string, role: string, v: number = 1, meta?: { username?: string; avatarUrl?: string }): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  return new SignJWT({ userId, role, v, username: meta?.username ?? '', avatarUrl: meta?.avatarUrl ?? '' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret)
}
