import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import type { JWTPayload } from '@/lib/modules/auth/auth'
import {
  getSessionRequestErrorResponse,
  validateQuizSessionRequest,
  type ValidateQuizSessionOptions,
} from '@/lib/modules/quiz/session-utils'

type ValidatedSessionHandler = (
  request: Request,
  id: string,
  session: any,
  payload: JWTPayload
) => Promise<NextResponse>

type SessionRouteErrorHandler = (error: unknown) => NextResponse

export function withQuizSessionRoute(
  handler: ValidatedSessionHandler,
  validationOptions: ValidateQuizSessionOptions = {},
  handleError: SessionRouteErrorHandler = getSessionRequestErrorResponse
) {
  return withAuth(async (
    request: Request,
    { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
  ) => {
    try {
      const { id } = await params
      const validation = await validateQuizSessionRequest(id, payload, validationOptions)
      if (!validation.isValid) return validation.response
      return await handler(request, id, validation.session, payload)
    } catch (error) {
      return handleError(error)
    }
  }, { roles: ['student'], allowGuest: true })
}
