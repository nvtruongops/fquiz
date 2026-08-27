import { NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from './jwt'
import { expandAllowedRoles } from './rbac'

type Handler<P = any> = (
  req: Request,
  context: { params: P; payload: JWTPayload }
) => Promise<Response | NextResponse>

interface WithAuthOptions {
  roles?: string[]
  allowGuest?: boolean
}

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
