/**
 * Sanitizes a URL to prevent DOM-based XSS (e.g. javascript: URLs).
 * Only allows HTTP, HTTPS, relative paths (starting with /), and safe data:image URLs.
 */
export function sanitizeUrl(url: string | undefined | null): string {
  if (!url) return ''
  const trimmed = url.trim()
  
  // Reject double slashes at start to prevent protocol-relative open redirects/XSS
  if (trimmed.startsWith('//')) {
    return ''
  }
  
  // Allow safe protocols
  if (/^(https?:\/\/|\/|data:image\/)/i.test(trimmed)) {
    // Extra safety: block javascript: or vbscript:
    if (/^(javascript:|vbscript:)/i.test(trimmed)) {
      return ''
    }
    return trimmed
  }
  
  return ''
}

/**
 * Sanitizes and encodes a URL path for safe inclusion in query strings (e.g., ?redirect=...)
 */
export function sanitizeRedirectPath(path: string | undefined | null): string {
  if (!path) return ''
  const trimmed = path.trim()
  
  // Only allow path starting with a single slash, no double slashes or external domains
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return encodeURIComponent(trimmed)
  }
  
  return ''
}
