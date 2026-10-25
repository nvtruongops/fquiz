import { jwtVerify, SignJWT } from 'jose'

export interface JWTPayload {
  userId: string
  role: string
  guestId?: string
  v?: number
  username?: string
  avatarUrl?: string
}

export const JWT_EXPIRY = '7d'
export const AUTH_COOKIE_NAME = 'auth-token'
export const GUEST_ID_COOKIE_NAME = 'fquiz-guest-id'
export const MAINTENANCE_COOKIE_NAME = 'maintenance-mode'

export async function decrypt(token: string): Promise<JWTPayload | null> {
  const secrets = [process.env.JWT_SECRET, process.env.JWT_SECRET_PREV].filter(Boolean) as string[]
  
  for (const secretStr of secrets) {
    try {
      const secret = new TextEncoder().encode(secretStr)
      const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
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
  return decrypt(token)
}

export async function signTokenWithSecret(
  secretStr: string,
  userId: string,
  role: string,
  v: number = 1,
  meta?: { username?: string; avatarUrl?: string }
): Promise<string> {
  const secret = new TextEncoder().encode(secretStr)
  return new SignJWT({ userId, role, v, username: meta?.username ?? '', avatarUrl: meta?.avatarUrl ?? '' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret)
}

export async function signToken(
  userId: string,
  role: string,
  v: number = 1,
  meta?: { username?: string; avatarUrl?: string }
): Promise<string> {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in production')
  }
  const secretStr = process.env.JWT_SECRET || 'fquiz-fallback-jwt-secret-for-development'
  return signTokenWithSecret(secretStr, userId, role, v, meta)
}

export function checkRole(payload: JWTPayload, role: string): boolean {
  return payload.role === role
}
