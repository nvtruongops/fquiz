import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  checkRateLimit,
  createRateLimitErrorResponse,
  decrypt,
  RATE_LIMIT_TIERS,
} from '@fquiz/auth'
import { validateCsrfRequest } from '@/lib/security/csrf'
import { AUTH_COOKIE_NAME, COOKIE_MAX_AGE, CSRF_COOKIE_NAME } from '@/lib/constants'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const PUBLIC_PATHS = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health',
])
const TOKEN_COOKIE_NAMES = [AUTH_COOKIE_NAME, 'auth-token', 'token']

const CSRF_REQUIRED_PUBLIC_PATHS = new Set(['/login', '/api/auth/login'])

function isStaticPath(pathname: string) {
  return pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/.test(pathname)
}

function ensureCsrfCookie(request: NextRequest, response: NextResponse): NextResponse {
  if (!request.cookies.has(CSRF_COOKIE_NAME)) {
    response.cookies.set(CSRF_COOKIE_NAME, crypto.randomUUID(), {
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
      maxAge: COOKIE_MAX_AGE,
    })
  }

  return response
}

function isBearerOnlyRequest(request: NextRequest, pathname: string): boolean {
  const hasAuthCookie = TOKEN_COOKIE_NAMES.some((name) => Boolean(request.cookies.get(name)?.value))
  const authorization = request.headers.get('authorization') || ''
  const hasBearerToken = authorization.startsWith('Bearer ') && authorization.slice(7).trim().length > 0
  return hasBearerToken && !hasAuthCookie && !CSRF_REQUIRED_PUBLIC_PATHS.has(pathname)
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname)
}

function getCookieToken(request: NextRequest) {
  for (const name of TOKEN_COOKIE_NAMES) {
    const token = request.cookies.get(name)?.value
    if (token) return token
  }
  return undefined
}

function getAuthToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || ''
  return getCookieToken(request) || (authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : undefined)
}

async function redirectLoggedInAdmin(request: NextRequest) {
  if (request.nextUrl.pathname !== '/login') return null
  const token = getCookieToken(request)
  if (!token) return null
  const payload = await decrypt(token)
  return getAdminLoginRedirect(request, payload?.role === 'admin')
}

function getAdminLoginRedirect(request: NextRequest, isAdmin: boolean) {
  return isAdmin ? NextResponse.redirect(new URL('/', request.url)) : null
}

async function handlePublicPath(request: NextRequest) {
  const response = await redirectLoggedInAdmin(request) || NextResponse.next()
  return ensureCsrfCookie(request, response)
}

function handleMissingToken(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 })
  }
  return NextResponse.redirect(new URL('/login', request.url))
}

function handleInvalidToken(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
  }
  const response = NextResponse.redirect(new URL('/login', request.url))
  response.cookies.delete(AUTH_COOKIE_NAME)
  return response
}

function forwardAdminIdentity(request: NextRequest, payload: { userId: string; role: string }) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-admin-id', payload.userId)
  requestHeaders.set('x-admin-role', payload.role)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

function handleAdminRateLimit(request: NextRequest, pathname: string): NextResponse | null {
  if (!pathname.startsWith('/api/') || pathname === '/api/health') return null
  const tier = SAFE_METHODS.has(request.method)
    ? RATE_LIMIT_TIERS.PUBLIC_READ_AUTH
    : RATE_LIMIT_TIERS.MUTATION_STANDARD
  const status = checkRateLimit(request, { ...tier, keyPrefix: `admin:${tier.keyPrefix}` })
  return status.success ? null : createRateLimitErrorResponse(status)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isStaticPath(pathname)) return NextResponse.next()
  if (!SAFE_METHODS.has(request.method) && !isBearerOnlyRequest(request, pathname)) {
    if (!validateCsrfRequest(request)) {
      return NextResponse.json({ error: 'Invalid or missing CSRF token' }, { status: 403 })
    }
  }
  const rateLimitResponse = handleAdminRateLimit(request, pathname)
  if (rateLimitResponse) return rateLimitResponse

  if (isPublicPath(pathname)) return handlePublicPath(request)

  const token = getAuthToken(request)
  if (!token) return handleMissingToken(request)

  const payload = await decrypt(token)
  if (!payload || payload.role !== 'admin') return handleInvalidToken(request)
  return forwardAdminIdentity(request, payload)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
