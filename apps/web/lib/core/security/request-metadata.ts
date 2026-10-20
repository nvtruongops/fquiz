export function getRequestMetadata(request: Request, route: string) {
  return {
    requestId: request.headers.get('x-request-id') || 'unknown',
    ip: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
    route,
  }
}
