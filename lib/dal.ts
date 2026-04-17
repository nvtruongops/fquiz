/**
 * Data Access Layer (DAL)
 * 
 * Next.js 16 Best Practice: Authentication checks should be done in the DAL,
 * not in middleware/proxy. This provides better security and performance.
 * 
 * Reference: https://nextjs.org/docs/app/guides/authentication
 */

import { cache } from 'react'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { connectDB } from './mongodb'
import { User } from '@/models/User'

export interface SessionUser {
  userId: string
  username: string
  role: 'student' | 'admin'
  status: 'active' | 'banned'
  avatarUrl?: string
}

/**
 * Verify session and return user data
 * Uses React cache() to dedupe requests within the same render
 */
export const verifySession = cache(async (): Promise<SessionUser | null> => {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) return null

    // Verify JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    
    const userId = payload.userId as string
    if (!userId) return null

    // Check user in database (includes banned status)
    await connectDB()
    const user = await User.findById(userId)
      .select('username role status avatar_url avatarUrl token_version')
      .lean()
    
    if (!user) return null
    
    // Check if user is banned
    if (user.status === 'banned') return null
    
    // Check token version (for logout all devices)
    const tokenVersion = payload.v as number | undefined
    if (tokenVersion !== undefined && (user.token_version || 1) !== tokenVersion) {
      return null
    }

    return {
      userId: user._id.toString(),
      username: user.username,
      role: user.role as 'student' | 'admin',
      status: user.status as 'active' | 'banned',
      avatarUrl: user.avatar_url || user.avatarUrl || undefined,
    }
  } catch (error) {
    console.error('[verifySession] Error:', error)
    return null
  }
})

/**
 * Get current user or redirect to login
 * Use this in Server Components that require authentication
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await verifySession()
  
  if (!user) {
    // In Server Components, we can't use useRouter, so we throw to trigger error boundary
    // The layout should handle this by showing login page
    throw new Error('UNAUTHORIZED')
  }
  
  return user
}

/**
 * Require admin role or throw error
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth()
  
  if (user.role !== 'admin') {
    throw new Error('FORBIDDEN')
  }
  
  return user
}

/**
 * Check if user is authenticated (doesn't throw)
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await verifySession()
  return user !== null
}
