import { NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { expandAllowedRoles } from '@/lib/modules/auth/constants'

type Handler<P = any> = (
  req: Request,
  context: { params: P; payload: JWTPayload }
) => Promise<Response | NextResponse>

interface WithAuthOptions {
  roles?: string[]
  allowGuest?: boolean
}

/**
 * Higher-order function wrapping a Next.js route handler with JWT
 * authentication and optional role-based authorization.
 * Supports allowGuest: true to enable public/guest access with guest payload.
 *
 * Usage:
 *   export const GET = withAuth(async (req, { params, payload }) => {
 *     // payload.userId, payload.role
 *     return NextResponse.json({ ... })
 *   }, { roles: ['student'], allowGuest: true })
 */
export function withAuth<P = any>(
  handler: Handler<P>,
  options: WithAuthOptions = {},
): (req: Request, context: { params: P }) => Promise<Response> {
  return async (req, context) => {
    const payload = await verifyToken(req)
    if (!payload) {
      if (options.allowGuest) {
        const guestPayload: JWTPayload = {
          userId: '',
          role: 'guest',
        }
        return handler(req, { ...context, payload: guestPayload })
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (options.roles) {
      const allowedRoles = expandAllowedRoles(options.roles)
      if (allowedRoles && !allowedRoles.includes(payload.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    return handler(req, { ...context, payload })
  }
}
