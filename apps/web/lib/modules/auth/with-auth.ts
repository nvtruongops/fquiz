export * from '@fquiz/auth'

import { withAuth as withSharedAuth, type JWTPayload } from '@fquiz/auth'
import { verifyToken } from './auth'

type Handler<P = any> = (
  req: Request,
  context: { params: P; payload: JWTPayload }
) => Promise<Response>

interface WithAuthOptions {
  roles?: string[]
  allowGuest?: boolean
}

export function withAuth<P = any>(
  handler: Handler<P>,
  options: WithAuthOptions = {},
) {
  return withSharedAuth(handler, { ...options, tokenVerifier: verifyToken })
}
