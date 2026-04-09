/** @type {import('next').NextConfig} */
const allowedDomains = (process.env.ALLOWED_IMAGE_DOMAINS || '').split(',').filter(Boolean)
const isProduction = process.env.NODE_ENV === 'production'
const defaultApiOrigin = 'https://fquiz-api.vercel.app'

function toOrigin(value) {
  const input = String(value || '').trim()
  if (!input) return null

  // CSP host sources should be scheme + origin; strip any paths/query/hash.
  const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`
  try {
    return new URL(candidate).origin
  } catch {
    return null
  }
}

const apiConnectOrigins = Array.from(
  new Set([
    defaultApiOrigin,
    ...String(process.env.NEXT_PUBLIC_API_BASE_URL || '')
      .split(',')
      .map((item) => toOrigin(item))
      .filter(Boolean),
  ])
)

const imgSrcDomains = allowedDomains.map((d) => d.trim()).join(' ')

const cspDirectives = [
  "default-src 'self'",
  `img-src 'self' data: https://res.cloudinary.com ${imgSrcDomains}`,
  [
    "script-src 'self' 'unsafe-inline' https://upload-widget.cloudinary.com https://cdn.cloudinary.com",
    isProduction ? '' : "'unsafe-eval'",
  ].filter(Boolean).join(' '),
  "style-src 'self' 'unsafe-inline' https://upload-widget.cloudinary.com",
  "font-src 'self' data:",
  `connect-src 'self' https://api.cloudinary.com https://upload-widget.cloudinary.com https://res.cloudinary.com ${apiConnectOrigins.join(' ')}`,
  "frame-src 'self' https://upload-widget.cloudinary.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "report-uri /api/security/csp-report",
]

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  ...(isProduction
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }]
    : []),
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-site',
  },
  {
    key: isProduction ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only',
    value: cspDirectives.join('; '),
  },
]

const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: allowedDomains.map((domain) => ({
      protocol: 'https',
      hostname: domain.trim(),
    })),
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
