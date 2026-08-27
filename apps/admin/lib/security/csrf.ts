import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/constants'

export function safeCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i += 1) {
    result |= (a.codePointAt(i) || 0) ^ (b.codePointAt(i) || 0)
  }
  return result === 0
}

export function getCsrfCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return undefined
  
  const row = cookieHeader.split('; ').find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`))
  if (!row) return undefined

  return row.split('=').slice(1).join('=')
}

export function validateCsrfRequest(request: Request): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true

  const csrfCookie = getCsrfCookie(request)
  const csrfHeader = request.headers.get(CSRF_HEADER_NAME)

  if (!csrfCookie || !csrfHeader) {
    return false
  }

  return safeCompare(csrfCookie, csrfHeader)
}
