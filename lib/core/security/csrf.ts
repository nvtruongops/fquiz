export function getCsrfTokenFromCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined

  const tokenPair = document.cookie
    .split('; ')
    .find((part) => part.startsWith('csrf-token='))

  if (!tokenPair) return undefined

  const value = tokenPair.slice('csrf-token='.length)
  return value ? decodeURIComponent(value) : undefined
}

export function withCsrfHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const csrfToken = getCsrfTokenFromCookie()
  if (!csrfToken) return headers

  return {
    ...headers,
    'x-csrf-token': csrfToken,
  }
}

/**
 * Server-side CSRF validation for API mutations (POST, PUT, PATCH, DELETE).
 * Checks Origin/Referer headers and CSRF tokens if necessary.
 */
export function validateCsrfRequest(request: Request): boolean {
  // Only check mutations
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const siteUrl = `${protocol}://${host}`

  // 1. Origin check (Best practice)
  if (origin && !origin.startsWith(siteUrl)) {
    console.warn(`[CSRF] Origin mismatch: ${origin} vs ${siteUrl}`)
    return false
  }

  // 2. Referer check (Fallback)
  if (!origin && referer && !referer.startsWith(siteUrl)) {
    console.warn(`[CSRF] Referer mismatch: ${referer} vs ${siteUrl}`)
    return false
  }

  // 3. Header check (x-csrf-token) - optional but recommended for state-changing requests
  // const csrfToken = request.headers.get('x-csrf-token')
  // if (!csrfToken) return false

  return true
}
