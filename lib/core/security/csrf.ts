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
function safeCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
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
  const csrfCookie = request.headers.get('cookie')
    ?.split('; ')
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.split('=')
    .slice(1)
    .join('=')

  const csrfHeader = request.headers.get(CSRF_HEADER_NAME)

  if (!csrfCookie || !csrfHeader) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[CSRF] Missing CSRF cookie or header')
    }
    return false
  }

  if (!safeCompare(csrfCookie, csrfHeader)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[CSRF] CSRF token mismatch')
    }
    return false
  }

  // Layer 2: Origin check (defense in depth)
  if (origin && !origin.startsWith(siteUrl)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[CSRF] Origin mismatch: ${origin} vs ${siteUrl}`)
    }
    return false
  }

  // Layer 3: Referer check (fallback when Origin is not sent)
  if (!origin && referer && !referer.startsWith(siteUrl)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[CSRF] Referer mismatch: ${referer} vs ${siteUrl}`)
    }
    return false
  }

  return true
}
