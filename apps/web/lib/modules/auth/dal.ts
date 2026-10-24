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
import { decrypt } from '@/lib/modules/auth/auth'
import {  connectDB  } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'

export interface SessionUser {
  userId: string
  username: string
  role: 'student' | 'teacher' | 'admin' | 'dev'
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

    // Verify JWT with rotation support
    const payload = await decrypt(token)
    if (!payload) return null
    
    const userId = payload.userId as string
    if (!userId) return null

    // Check current user authorization claims in the database.
    await connectDB()
    const user = await User.findById(userId)
      .select('username role status avatar_url avatarUrl token_version')
      .lean()
    
    if (!user) return null
    
    if (user.status !== 'active' || user.role !== payload.role) return null

    // Treat tokens issued before versioning as version 1.
    const tokenVersion = (payload.v as number | undefined) ?? 1
    if ((user.token_version ?? 1) !== tokenVersion) {
      return null
    }

    return {
      userId: user._id.toString(),
      username: user.username,
      role: user.role as 'student' | 'admin' | 'dev',
      status: user.status as 'active' | 'banned',
      avatarUrl: user.avatar_url || undefined,
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

