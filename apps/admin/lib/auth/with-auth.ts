import { NextResponse } from 'next/server'
import { verifyAdminToken, JWTPayload } from '@/lib/auth/auth'

type Handler<P = any> = (
  req: Request,
  context: { params: Promise<P>; payload: JWTPayload }
) => Promise<Response | NextResponse>

interface WithAuthOptions {
  roles?: string[]
}

export function withAuth<P = any>(
  handler: Handler<P>,
  options: WithAuthOptions = { roles: ['admin'] }
): (req: Request, context: { params: Promise<P> }) => Promise<Response> {
  return async (req, context) => {
    const payload = await verifyAdminToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 })
    }

    const allowedRoles = options.roles || ['admin']
    if (!allowedRoles.includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
    }

    return handler(req, { ...context, payload })
  }
}
