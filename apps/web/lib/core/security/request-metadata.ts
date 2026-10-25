import { getClientIp } from '@fquiz/auth'

export function getRequestMetadata(request: Request, route: string) {
  return {
    requestId: request.headers.get('x-request-id') || 'unknown',
    ip: getClientIp(request),
    route,
  }
}
