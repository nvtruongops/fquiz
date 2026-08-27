import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { User } from '@/lib/models/User'
import { JWT_EXPIRY, AUTH_COOKIE_NAME } from '@/lib/constants'

export interface JWTPayload {
  userId: string
  role: string
  username?: string
  avatarUrl?: string
  v?: number
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

export async function verifyAdminToken(req?: Request): Promise<JWTPayload | null> {
  // 1. Check if edge proxy already verified JWT and injected x-admin-id & x-admin-role
  if (req) {
    const headerUserId = req.headers.get('x-admin-id')
    const headerRole = req.headers.get('x-admin-role')
    if (headerUserId && headerRole && headerRole === 'admin') {
      return {
        userId: headerUserId,
        role: headerRole,
      }
    }
  }

  // 2. Cookie or authorization header check
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
    if (user.status === 'banned') return null
    if (user.role !== 'admin') return null
    if (jwtPayload.v !== undefined && user.token_version !== undefined && user.token_version !== jwtPayload.v) {
      return null
    }

    return jwtPayload
  } catch {
    return jwtPayload
  }
}

export async function signAdminToken(
  userId: string,
  role: string,
  v: number = 1,
  meta?: { username?: string; avatarUrl?: string }
): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fquiz-admin-default-secret-key-32ch')
  return new SignJWT({
    userId,
    role,
    v,
    username: meta?.username ?? '',
    avatarUrl: meta?.avatarUrl ?? '',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret)
}
