import { NextResponse } from 'next/server'
import { GUEST_ID_COOKIE_NAME, verifyToken, JWTPayload } from './jwt'
import { expandAllowedRoles } from './rbac'

const GUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function getGuestId(req: Request): string | undefined {
  const cookieHeader = req.headers.get('cookie') || ''
  const value = cookieHeader
    .split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${GUEST_ID_COOKIE_NAME}=`))
    ?.slice(GUEST_ID_COOKIE_NAME.length + 1)

  return value && GUEST_ID_PATTERN.test(value) ? value.toLowerCase() : undefined
}

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
    const guestId = getGuestId(req)
    const payload = await verifyToken(req)
    if (!payload) {
      if (options.allowGuest) {
        const guestPayload: JWTPayload = {
          userId: '',
          role: 'guest',
          guestId,
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
    return handler(req, { ...context, payload: { ...payload, guestId } })
  }
}
