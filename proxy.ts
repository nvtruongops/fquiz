import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password', '/terms', '/privacy', '/explore', '/api/security/csp-report'])
const PUBLIC_API_EXEMPT_CSRF = new Set(['/api/auth/login', '/api/auth/register', '/api/auth/register/send-code', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/logout'])
const STUDENT_PATHS = ['/dashboard', '/courses', '/quiz', '/history', '/my-quizzes', '/create', '/community', '/profile', '/settings']
const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

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
  loginUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname))
  return NextResponse.redirect(loginUrl)
}

function isPublicRoute(pathname: string) {
  const isPublicQuizDetail = /^\/quiz\/[a-zA-Z0-9]+$/.test(pathname)
  return PUBLIC_PATHS.has(pathname) || isPublicQuizDetail
}

function shouldSkipAuth(pathname: string) {
  return pathname.startsWith('/api/v1/public/') || pathname.startsWith('/api/auth/')
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

  const legacyHistoryMatch = /^\/history\/([a-fA-F0-9]{24})$/.exec(pathname)
  const legacySessionId = request.nextUrl.searchParams.get('sessionId')
  if (legacyHistoryMatch && legacySessionId && /^[a-fA-F0-9]{24}$/.test(legacySessionId)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = `/history/${legacyHistoryMatch[1]}/${legacySessionId}`
    redirectUrl.searchParams.delete('sessionId')
    return NextResponse.redirect(redirectUrl)
  }

  const response = NextResponse.next()
  response.headers.set('x-request-id', requestId)

  const csrfError = validateCsrf(request, pathname, requestId)
  if (csrfError) return csrfError

  ensureCsrfCookie(request, response)

  if (isPublicRoute(pathname) || shouldSkipAuth(pathname)) {
    return response
  }

  const token =
    request.cookies.get('auth-token')?.value ??
    request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return createUnauthorizedResponse(requestId)
    }
    return redirectToLogin(request, pathname)
  }

  const payload = await verifyPayload(token)
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return createUnauthorizedResponse(requestId)
    }
    return redirectToLogin(request, pathname)
  }

  const role = typeof payload.role === 'string' ? payload.role : ''
  const roleResponse = enforceRoleRouting(pathname, role, request, requestId)
  if (roleResponse) return roleResponse

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
