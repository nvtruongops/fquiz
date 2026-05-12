import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

export interface ServerUser {
  name: string
  role: string
  avatarUrl: string
}

/**
 * Read auth-token cookie server-side and decode user info for SSR.
 * Used in Server Components (layouts, pages) to avoid client-side flash.
 * Does NOT hit the database - only decodes the JWT payload.
 */
export async function getServerUser(): Promise<ServerUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    if (!token) return null

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)

    const userId = payload.userId as string | undefined
    const role = payload.role as string | undefined
    if (!userId || !role) return null

    // Return minimal info from JWT - no DB call needed
    // Full user data (avatar, name) still fetched client-side via /api/auth/me
    // but this prevents the login/register flash on initial render
    return {
      name: (payload.username as string) || (payload.name as string) || '',
      role,
      avatarUrl: (payload.avatarUrl as string) || '',
    }
  } catch {
    return null
  }
}
