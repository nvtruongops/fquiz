import { jwtVerify, SignJWT } from 'jose'
import { connectDB } from '@fquiz/database'
import { User } from '@fquiz/models'

export interface JWTPayload {
  userId: string
  role: string
  v?: number
  username?: string
  avatarUrl?: string
}

export const JWT_EXPIRY = '7d'

// Short-lived cache for token_version and status to reduce DB load
const userStatusCache = new Map<string, { version: number; status: string; expires: number }>()
const CACHE_TTL = 60 * 1000 // 60 seconds

export function clearUserStatusCache(userId: string): void {
  userStatusCache.delete(userId)
}

export async function checkUserSession(userId: string, version?: number): Promise<boolean> {
  const now = Date.now()
  const cached = userStatusCache.get(userId)

  if (cached && cached.expires > now) {
    return cached.status === 'active' && (version === undefined || cached.version === version)
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

    return user.status === 'active' && (version === undefined || (user.token_version || 1) === version)
  } catch (err) {
    console.error('[checkUserSession] DB Error:', err)
    return false
  }
}

export async function decrypt(token: string): Promise<JWTPayload | null> {
  const secrets = [process.env.JWT_SECRET, process.env.JWT_SECRET_PREV].filter(Boolean) as string[]
  
  for (const secretStr of secrets) {
    try {
      const secret = new TextEncoder().encode(secretStr)
      const { payload } = await jwtVerify(token, secret)
      return payload as unknown as JWTPayload
    } catch {
      continue
    }
  }
  return null
}

export async function verifyToken(req: Request): Promise<JWTPayload | null> {
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
    const isValid = await checkUserSession(jwtPayload.userId, jwtPayload.v)
    if (!isValid) {
      return null
    }

    return jwtPayload
  } catch (err) {
    return null
  }
}

export async function signToken(
  userId: string,
  role: string,
  v: number = 1,
  meta?: { username?: string; avatarUrl?: string }
): Promise<string> {
  const secretStr = process.env.JWT_SECRET || 'fquiz-fallback-jwt-secret-for-development'
  const secret = new TextEncoder().encode(secretStr)
  return new SignJWT({ userId, role, v, username: meta?.username ?? '', avatarUrl: meta?.avatarUrl ?? '' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret)
}

export function checkRole(payload: JWTPayload, role: string): boolean {
  return payload.role === role
}
