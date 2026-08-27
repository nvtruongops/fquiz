export const CSRF_COOKIE_NAME = 'csrf-token'
export const CSRF_HEADER_NAME = 'x-csrf-token'

export function getCsrfTokenFromCookie(): string | undefined {
  if (typeof (globalThis as any).document === 'undefined') return undefined

  const tokenPair = (globalThis as any).document?.cookie
    ?.split('; ')
    ?.find((part: string) => part.startsWith(`${CSRF_COOKIE_NAME}=`))

  if (!tokenPair) return undefined

  const value = tokenPair.slice(`${CSRF_COOKIE_NAME}=`.length)
  return value ? decodeURIComponent(value) : undefined
}

export function withCsrfHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const csrfToken = getCsrfTokenFromCookie()
  if (!csrfToken) return headers

  return {
    ...headers,
    [CSRF_HEADER_NAME]: csrfToken,
  }
}

export function safeCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i += 1) {
    result |= (a.codePointAt(i) || 0) ^ (b.codePointAt(i) || 0)
  }
  return result === 0
}

function isValidOrigin(origin: string, siteUrl: string): boolean {
  try {
    const originObj = new URL(origin)
    return originObj.origin === siteUrl
  } catch {
    return false
  }
}

function isValidReferer(referer: string, siteUrl: string): boolean {
  try {
    const refererObj = new URL(referer)
    return refererObj.origin === siteUrl
  } catch {
    return false
  }
}

function getCsrfCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return undefined
  
  const row = cookieHeader.split('; ').find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`))
  if (!row) return undefined

  return row.split('=').slice(1).join('=')
}

export function validateCsrfRequest(request: Request): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const siteUrl = `${protocol}://${host}`

  const csrfCookie = getCsrfCookie(request)
  const csrfHeader = request.headers.get(CSRF_HEADER_NAME)

  if (!csrfCookie || !csrfHeader) {
    return false
  }

  if (!safeCompare(csrfCookie, csrfHeader)) {
    return false
  }

  if (origin && !isValidOrigin(origin, siteUrl)) {
    return false
  }

  if (!origin && referer && !isValidReferer(referer, siteUrl)) {
    return false
  }

  return true
}
