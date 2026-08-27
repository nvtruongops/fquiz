/**
 * Utility to dynamically resolve the production base URL for email callbacks, redirects, and links.
 */
function cleanUrl(url: string, defaultScheme = 'https'): string {
  const trimmed = url.trim().replace(/\/$/, '')
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `${defaultScheme}://${trimmed}`
}

function getRequestBaseUrl(req: Request): string | null {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (!host) return null

  const rawProto = req.headers.get('x-forwarded-proto')
  const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1')
  const proto = rawProto ? rawProto.split(',')[0].trim() : (isLocalHost ? 'http' : 'https')
  return `${proto}://${host}`.replace(/\/$/, '')
}

export function resolveAppBaseUrl(req?: Request): string {
  // 1. Production APP_URL or Vercel production domain
  const prodUrl = process.env.APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (prodUrl?.trim()) {
    return cleanUrl(prodUrl)
  }

  // 2. Next public app URL config
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl?.trim()) {
    return cleanUrl(envUrl)
  }

  // 3. Vercel preview/deployment URL
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl?.trim()) {
    return cleanUrl(vercelUrl)
  }

  // 4. Request header host fallback
  if (req) {
    const reqUrl = getRequestBaseUrl(req)
    if (reqUrl) return reqUrl
  }

  return 'http://localhost:3000'
}

