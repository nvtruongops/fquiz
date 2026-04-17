import { jwtVerify, SignJWT } from 'jose'
import { connectDB } from './mongodb'
import { User } from '@/models/User'
import { logJWTVerificationFailed, logSecurityEvent } from './logger'

export interface JWTPayload {
  userId: string
  role: string
  v?: number // token version
}

// Short-lived cache for token_version and status to reduce DB load
const userStatusCache = new Map<string, { version: number; status: string; expires: number }>()
const CACHE_TTL = 60 * 1000 // 60 seconds

/**
 * Clear user status cache - call this when admin bans/unbans a user
 */
export function clearUserStatusCache(userId: string): void {
  userStatusCache.delete(userId)
}

/**
 * Clear all user status cache - call this when doing bulk operations
 */
export function clearAllUserStatusCache(): void {
  userStatusCache.clear()
}

async function checkUserSession(userId: string, version?: number): Promise<boolean> {
  const now = Date.now()
  const cached = userStatusCache.get(userId)

  if (cached && cached.expires > now) {
    if (cached.status !== 'active') return false
    if (version !== undefined && cached.version !== version) return false
    return true
  }

  try {
    await connectDB()
    const user = await User.findById(userId).select('token_version status').lean()
    
    if (!user) return false

    userStatusCache.set(userId, {
      version: user.token_version || 1,
      status: user.status,
      expires: now + CACHE_TTL
    })

    if (user.status !== 'active') return false
    if (version !== undefined && (user.token_version || 1) !== version) return false

    return true
  } catch (err) {
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

  const secrets = [process.env.JWT_SECRET, process.env.JWT_SECRET_PREV].filter(Boolean) as string[]

  let lastError: any = null

  for (const secretStr of secrets) {
    try {
      const secret = new TextEncoder().encode(secretStr)
      const { payload } = await jwtVerify(token, secret)
      const jwtPayload = payload as unknown as JWTPayload

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
      lastError = err
      continue
    }
  }

  if (lastError) {
    const requestId = req.headers.get('x-request-id') || 'unknown'
    logJWTVerificationFailed(
      { request_id: requestId, route: new URL(req.url).pathname, outcome: 'failure' },
      lastError instanceof Error ? lastError.message : 'Unknown error'
    )
  }

  return null
}

export async function signToken(userId: string, role: string, v: number = 1, meta?: { username?: string; avatarUrl?: string }): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  return new SignJWT({ userId, role, v, username: meta?.username ?? '', avatarUrl: meta?.avatarUrl ?? '' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
}

/**
 * Throws a 403 Response if the payload role does not match the required role.
 * Usage: requireRole(payload, 'admin') — throws if not admin.
 */
export function requireRole(payload: JWTPayload, role: string): void {
  if (payload.role !== role) {
    throw new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
