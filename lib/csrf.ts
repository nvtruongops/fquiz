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
