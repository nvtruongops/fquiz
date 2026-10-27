/**
 * Utility to dynamically resolve the production base URL for email callbacks, redirects, and links.
 */
function cleanUrl(url: string, defaultScheme = 'https'): string {
  const trimmed = url.trim().replace(/\/$/, '')
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `${defaultScheme}://${trimmed}`
}

export function resolveAppBaseUrl(req?: Request): string {
  const configuredUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
  if (configuredUrl?.trim()) return cleanUrl(configuredUrl)

  if (req) return new URL(req.url).origin

  throw new Error('APP_URL or a deployment URL is required')
}

