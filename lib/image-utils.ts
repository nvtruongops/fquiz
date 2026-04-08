/**
 * Validates that the domain of a given URL is present in the
 * ALLOWED_IMAGE_DOMAINS environment variable (comma-separated list).
 */
export function validateImageDomain(url: string): boolean {
  const allowedRaw = process.env.ALLOWED_IMAGE_DOMAINS ?? ''
  const allowedDomains = allowedRaw
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)

  if (allowedDomains.length === 0) return false

  try {
    const { hostname } = new URL(url)
    return allowedDomains.includes(hostname.toLowerCase())
  } catch {
    // Invalid URL
    return false
  }
}
