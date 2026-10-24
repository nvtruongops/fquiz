export * from '@fquiz/auth'

import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, expandAllowedRoles, GUEST_ID_COOKIE_NAME } from '@fquiz/auth'
import { verifyToken, type JWTPayload } from './auth'

const GUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Handler<P = any> = (
  req: Request,
  context: { params: P; payload: JWTPayload }
) => Promise<Response | NextResponse>

interface WithAuthOptions {
  roles?: string[]
  allowGuest?: boolean
}

function getCookieValue(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookie = cookieHeader.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`))
  return cookie?.slice(name.length + 1) || undefined
}

function hasAuthCredential(request: Request): boolean {
  const cookieToken = getCookieValue(request, AUTH_COOKIE_NAME)
  const authorization = request.headers.get('authorization') || ''
  return Boolean(cookieToken) || (authorization.startsWith('Bearer ') && authorization.slice(7).trim().length > 0)
}

function getGuestId(request: Request): string | undefined {
  const guestId = getCookieValue(request, GUEST_ID_COOKIE_NAME)
  return guestId && GUEST_ID_PATTERN.test(guestId) ? guestId.toLowerCase() : undefined
}

export function withAuth<P = any>(
  handler: Handler<P>,
  options: WithAuthOptions = {},
): (req: Request, context: { params: P }) => Promise<Response> {
  return async (req, context) => {
    const payload = await verifyToken(req)

    if (!payload) {
      if (options.allowGuest && !hasAuthCredential(req)) {
        const guestId = getGuestId(req)
        const guestPayload: JWTPayload = {
          userId: '',
          role: 'guest',
          ...(guestId ? { guestId } : {}),
        }
        return handler(req, { ...context, payload: guestPayload })
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = expandAllowedRoles(options.roles)
    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const guestId = payload.guestId ?? getGuestId(req)
    return handler(req, {
      ...context,
      payload: { ...payload, ...(guestId ? { guestId } : {}) },
    })
  }
}
