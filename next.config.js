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
  `img-src 'self' data: blob: https://*.googleusercontent.com https://lh3.googleusercontent.com ${imgSrcDomains}`,
  [
    "script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client",
    isProduction ? '' : "'unsafe-eval'",
  ].filter(Boolean).join(' '),
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  "font-src 'self' data:",
  `connect-src 'self' https://accounts.google.com/gsi/ ${apiConnectOrigins.join(' ')}`,
  "frame-src 'self' https://accounts.google.com/",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
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
    value: 'same-origin-allow-popups',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'cross-origin',
  },
  {
    key: isProduction ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only',
    value: cspDirectives.join('; '),
  },
]

const nextConfig = {
  poweredByHeader: false,
  // Strip console.* from production bundles (both client and server) to avoid
  // leaking internal state/IDs in the browser console. Keep error/warn so real
  // failures remain observable. Server-side structured logging uses pino (stdout),
  // which is unaffected by this.
  compiler: {
    removeConsole: isProduction ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-scroll-area',
      'recharts',
    ],
  },
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
