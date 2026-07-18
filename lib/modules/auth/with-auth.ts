import { NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'

type Handler<P = any> = (
  req: Request,
  context: { params: P; payload: JWTPayload }
) => Promise<Response | NextResponse>

interface WithAuthOptions {
  roles?: string[]
}

/**
 * Higher-order function wrapping a Next.js route handler with JWT
 * authentication and optional role-based authorization.
 *
 * Usage:
 *   export const GET = withAuth(async (req, { params, payload }) => {
 *     // payload.userId, payload.role are guaranteed
 *     return NextResponse.json({ ... })
 *   }, { roles: ['student'] })
 */
export function withAuth<P = any>(
  handler: Handler<P>,
  options: WithAuthOptions = {},
): (req: Request, context: { params: P }) => Promise<Response> {
  return async (req, context) => {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (options.roles) {
      const allowedRoles = options.roles.includes('student') && !options.roles.includes('dev')
        ? [...options.roles, 'dev']
        : options.roles
      if (!allowedRoles.includes(payload.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    return handler(req, { ...context, payload })
  }
}
