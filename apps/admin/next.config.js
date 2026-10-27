/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production'
const analyticsOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL ? new URL(process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL).origin : ''
  } catch {
    return ''
  }
})()

const cspDirectives = [
  "default-src 'self'",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://lh3.googleusercontent.com",
  [
    `script-src 'self' 'unsafe-inline' ${analyticsOrigin}`,
    isProduction ? '' : "'unsafe-eval'",
  ].filter(Boolean).join(' '),
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `connect-src 'self' ${analyticsOrigin}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
]

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  ...(isProduction ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }] : []),
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  {
    key: isProduction ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only',
    value: cspDirectives.join('; '),
  },
]

const nextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@fquiz/database', '@fquiz/models', '@fquiz/auth', '@fquiz/ui'],
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
      'recharts',
    ],
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
