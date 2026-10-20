import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt, JWTPayload } from '@/lib/auth/auth'
import { connectDB } from '@/lib/db/mongodb'
import { User, IUser } from '@/lib/models/User'
import { AUTH_COOKIE_NAME } from '@/lib/constants'

function isValidTokenVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
}

function hasValidAdminPayload(payload: JWTPayload | null): payload is JWTPayload {
  return payload !== null && payload.role === 'admin' && isValidTokenVersion(payload.v)
}

function isCurrentAdmin(user: any, payload: JWTPayload): boolean {
  return user?.status === 'active' && user.role === 'admin' && user.token_version === payload.v
}

export async function getCurrentAdmin(): Promise<IUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value

  if (!token) return null

  const payload: JWTPayload | null = await decrypt(token)
  if (!hasValidAdminPayload(payload)) return null

  try {
    await connectDB()
    const user = await User.findById(payload.userId).lean()
    return isCurrentAdmin(user, payload) ? user as unknown as IUser : null
  } catch {
    return null
  }
}

export async function requireAdmin(): Promise<IUser> {
  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect('/login')
  }
  return admin
}
