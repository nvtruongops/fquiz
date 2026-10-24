import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'
import { logJWTVerificationFailed, logSecurityEvent } from '@/lib/core/utils/logger'
import { decrypt, checkRole, signTokenWithSecret, type JWTPayload as AuthJWTPayload } from '@fquiz/auth'

export type JWTPayload = AuthJWTPayload
export { decrypt, checkRole }

// Keep the short-lived cache for non-production environments only.
const userStatusCache = new Map<string, { version: number; status: string; role: string; expires: number }>()
const CACHE_TTL = 60 * 1000 // 60 seconds

/**
 * Clear user status cache - call this when admin bans/unbans a user
 */
export function clearUserStatusCache(userId: string): void {
  userStatusCache.delete(userId)
}

async function checkUserSession(userId: string, version: number | undefined, role: string): Promise<boolean> {
  const now = Date.now()
  const cacheEnabled = process.env.NODE_ENV !== 'production'
  const cached = cacheEnabled ? userStatusCache.get(userId) : undefined

  if (cached && cached.expires > now) {
    return cached.status === 'active' && cached.role === role && (version ?? 1) === cached.version
  }

  try {
    await connectDB()
    const user = await User.findById(userId).select('token_version status role').lean()
    
    if (!user) {
      return process.env.NODE_ENV !== 'production'
    }

    if (cacheEnabled) {
      userStatusCache.set(userId, {
        version: user.token_version || 1,
        status: user.status,
        role: user.role,
        expires: now + CACHE_TTL
      })
    }

    return user.status === 'active' && user.role === role && (version ?? 1) === (user.token_version ?? 1)
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') return true
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
  const tokenVersion = jwtPayload.v
  if (typeof tokenVersion !== 'number' || !Number.isInteger(tokenVersion) || tokenVersion < 1) return null

  try {
    // Enforce session revocation and status check
    const isValid = await checkUserSession(jwtPayload.userId, tokenVersion, jwtPayload.role)
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
  return signTokenWithSecret(process.env.JWT_SECRET ?? '', userId, role, v, meta)
}
