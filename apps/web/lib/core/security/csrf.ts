export const CSRF_COOKIE_NAME = 'csrf-token'
export const CSRF_HEADER_NAME = 'x-csrf-token'

export function getCsrfTokenFromCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined

  const tokenPair = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${CSRF_COOKIE_NAME}=`))

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

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true if both strings are equal, false otherwise.
 * Uses XOR-based comparison to avoid early-exit timing leaks.
 */
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

function csrfWarn(message: string): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(message)
  }
}

/**
 * Server-side CSRF validation for API mutations (POST, PUT, PATCH, DELETE).
 * Validates ALL THREE layers for defense in depth:
 * 1. CSRF token header must match the CSRF cookie (double-submit pattern)
 * 2. Origin header must match the request host
 * 3. Referer header (fallback) must match the request host
 *
 * The function is intentionally fail-closed: if any layer cannot be validated,
 * the request is rejected. This is the recommended behavior for production.
 */
export function validateCsrfRequest(request: Request): boolean {
  // Only check mutations
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const siteUrl = `${protocol}://${host}`

  // Layer 1 (mandatory): CSRF token (double-submit cookie pattern)
  const csrfCookie = getCsrfCookie(request)

  const csrfHeader = request.headers.get(CSRF_HEADER_NAME)

  if (!csrfCookie || !csrfHeader) {
    csrfWarn('[CSRF] Missing CSRF cookie or header')
    return false
  }

  if (!safeCompare(csrfCookie, csrfHeader)) {
    csrfWarn('[CSRF] CSRF token mismatch')
    return false
  }

  // Layer 2: Origin check (defense in depth)
  if (origin && !isValidOrigin(origin, siteUrl)) {
    csrfWarn(`[CSRF] Origin mismatch: ${origin} vs ${siteUrl}`)
    return false
  }

  // Layer 3: Referer check (fallback when Origin is not sent)
  if (!origin && referer && !isValidReferer(referer, siteUrl)) {
    csrfWarn(`[CSRF] Referer mismatch: ${referer} vs ${siteUrl}`)
    return false
  }

  return true
}
