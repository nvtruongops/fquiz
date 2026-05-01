import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password', '/terms', '/privacy', '/explore', '/api/security/csp-report'])
const PUBLIC_API_EXEMPT_CSRF = new Set(['/api/auth/login', '/api/auth/register', '/api/auth/register/send-code', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/logout'])
const STUDENT_PATHS = ['/dashboard', '/courses', '/quiz', '/history', '/my-quizzes', '/create', '/community', '/profile', '/settings']
const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])
const CORS_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
const CORS_HEADERS = 'Content-Type, Authorization, x-csrf-token'

function toOrigin(value: string) {
  const input = String(value || '').trim()
  if (!input) return null

  const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`
  try {
    return new URL(candidate).origin
  } catch {
    return null
  }
}

const corsAllowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS || 'https://fquiz-web.vercel.app')
    .split(',')
    .map((item) => toOrigin(item))
    .filter((item): item is string => Boolean(item))
)

function applyCors(request: NextRequest, response: NextResponse) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/api/')) return response

  const origin = request.headers.get('origin')
  if (origin && corsAllowedOrigins.has(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.append('Vary', 'Origin')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', CORS_METHODS)
    response.headers.set('Access-Control-Allow-Headers', CORS_HEADERS)
  }

  return response
}

function getSecrets(): Uint8Array[] {
  const secrets: Uint8Array[] = []
  if (process.env.JWT_SECRET) secrets.push(new TextEncoder().encode(process.env.JWT_SECRET))
  if (process.env.JWT_SECRET_PREV) secrets.push(new TextEncoder().encode(process.env.JWT_SECRET_PREV))
  return secrets
}

function generateId(length = 32) {
  const array = new Uint8Array(length / 2)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

function createUnauthorizedResponse(requestId: string) {
  return NextResponse.json({ error: 'Unauthorized' }, {
    status: 401,
    headers: { 'x-request-id': requestId }
  })
}

function createForbiddenResponse(requestId: string) {
  return NextResponse.json({ error: 'Forbidden' }, {
    status: 403,
    headers: { 'x-request-id': requestId }
  })
}

function createCsrfErrorResponse(requestId: string) {
  return NextResponse.json({ error: 'Invalid or missing CSRF token' }, {
    status: 403,
    headers: { 'x-request-id': requestId }
  })
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('callbackUrl', pathname)
  return NextResponse.redirect(loginUrl)
}

function getUnauthorizedOrRedirect(pathname: string, request: NextRequest, requestId: string) {
  if (pathname.startsWith('/api/')) {
    return createUnauthorizedResponse(requestId)
  }
  return redirectToLogin(request, pathname)
}

function isPublicRoute(pathname: string) {
  // Allow viewing quiz detail page without auth (but starting quiz requires auth)
  const isPublicQuizDetail = /^\/quiz\/[a-zA-Z0-9]+$/.test(pathname)
  const isStaticAsset = /\.(png|jpg|jpeg|gif|svg|ico|webp)$/i.test(pathname)
  return PUBLIC_PATHS.has(pathname) || isPublicQuizDetail || isStaticAsset
}

function shouldSkipAuth(pathname: string) {
  return pathname.startsWith('/api/v1/public/') || 
         pathname.startsWith('/api/v1/explore/') || // optional auth - handles auth internally
         pathname.startsWith('/api/auth/')
}

function validateCsrf(request: NextRequest, pathname: string, requestId: string) {
  const isMutation = MUTATION_METHODS.has(request.method)
  const isExempt = PUBLIC_PATHS.has(pathname) || PUBLIC_API_EXEMPT_CSRF.has(pathname)

  if (!isMutation || isExempt) return null

  const csrfCookie = request.cookies.get('csrf-token')?.value
  const csrfHeader = request.headers.get('x-csrf-token')

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return createCsrfErrorResponse(requestId)
  }

  return null
}

function ensureCsrfCookie(request: NextRequest, response: NextResponse) {
  if (!request.cookies.has('csrf-token')) {
    response.cookies.set('csrf-token', generateId(), {
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
    })
  }
}

async function verifyPayload(token: string): Promise<Record<string, unknown> | null> {
  const secrets = getSecrets()

  for (const secret of secrets) {
    try {
      const { payload } = await jwtVerify(token, secret)
      return payload as Record<string, unknown>
    } catch {
      // Try next secret in rotation set.
    }
  }

  return null
}

function enforceRoleRouting(pathname: string, role: string, request: NextRequest, requestId: string) {
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (STUDENT_PATHS.some((p) => pathname.startsWith(p)) && role !== 'student') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  if (pathname.startsWith('/api/admin') && role !== 'admin') {
    return createForbiddenResponse(requestId)
  }

  return null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const requestId = request.headers.get('x-request-id') || generateId()
  const deployTarget = process.env.DEPLOY_TARGET

  // Mobile detection and redirect for quiz session pages
  const quizSessionPattern = /^\/quiz\/[^/]+\/session\/[^/]+$/
  const isMobilePath = pathname.includes('/mobile')
  
  if (quizSessionPattern.test(pathname) && !isMobilePath) {
    const userAgent = request.headers.get('user-agent') || ''
    
    // Detect mobile devices and tablets
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    
    if (isMobileDevice) {
      const url = request.nextUrl.clone()
      url.pathname = `${pathname}/mobile`
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 })
    preflight.headers.set('x-request-id', requestId)
    return applyCors(request, preflight)
  }

  // Split deployments by target: API project only serves /api/*,
  // WEB project serves pages and keeps CSP report endpoint accessible.
  if (deployTarget === 'api' && !pathname.startsWith('/api/')) {
    const blockedResponse = NextResponse.json(
      { error: 'Not Found' },
      { status: 404, headers: { 'x-request-id': requestId } }
    )
    return applyCors(request, blockedResponse)
  }

  const legacyHistoryMatch = /^\/history\/([a-fA-F0-9]{24})$/.exec(pathname)
  const legacySessionId = request.nextUrl.searchParams.get('sessionId')
  if (legacyHistoryMatch && legacySessionId && /^[a-fA-F0-9]{24}$/.test(legacySessionId)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = `/history/${legacyHistoryMatch[1]}/${legacySessionId}`
    redirectUrl.searchParams.delete('sessionId')
    return applyCors(request, NextResponse.redirect(redirectUrl))
  }

  const response = NextResponse.next()
  response.headers.set('x-request-id', requestId)
  applyCors(request, response)

  const csrfError = validateCsrf(request, pathname, requestId)
  if (csrfError) return applyCors(request, csrfError)

  ensureCsrfCookie(request, response)

  if (isPublicRoute(pathname) || shouldSkipAuth(pathname)) {
    return response
  }

  const token =
    request.cookies.get('auth-token')?.value ??
    request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return applyCors(request, getUnauthorizedOrRedirect(pathname, request, requestId))
  }

  const payload = await verifyPayload(token)
  if (!payload) {
    return applyCors(request, getUnauthorizedOrRedirect(pathname, request, requestId))
  }

  const role = typeof payload.role === 'string' ? payload.role : ''
  const roleResponse = enforceRoleRouting(pathname, role, request, requestId)
  if (roleResponse) return applyCors(request, roleResponse)

  return applyCors(request, response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
