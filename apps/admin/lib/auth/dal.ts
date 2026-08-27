import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt, JWTPayload } from '@/lib/auth/auth'
import { connectDB } from '@/lib/db/mongodb'
import { User, IUser } from '@/lib/models/User'
import { AUTH_COOKIE_NAME } from '@/lib/constants'

export async function getCurrentAdmin(): Promise<IUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value

  if (!token) return null

  const payload: JWTPayload | null = await decrypt(token)
  if (!payload || payload.role !== 'admin') return null

  try {
    await connectDB()
    const user = await User.findById(payload.userId).lean()
    if (!user || user.status === 'banned' || user.role !== 'admin') {
      return null
    }
    return user as unknown as IUser
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
