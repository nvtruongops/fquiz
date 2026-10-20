import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth/auth'
import { AUTH_COOKIE_NAME } from '@/lib/constants'

const PUBLIC_PATHS = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/quizzes/check-code',
])
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const TOKEN_COOKIE_NAMES = [AUTH_COOKIE_NAME, 'auth-token', 'token']

function isStaticPath(pathname: string) {
  return pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/.test(pathname)
}

function hasCookieToken(request: NextRequest) {
  return TOKEN_COOKIE_NAMES.some((name) => Boolean(request.cookies.get(name)?.value))
}

function hasSameOriginSource(request: NextRequest) {
  const source = request.headers.get('origin') || request.headers.get('referer')
  if (!source) return false
  try {
    return new URL(source).origin === request.nextUrl.origin
  } catch {
    return false
  }
}

function isSameOriginMutation(request: NextRequest) {
  return SAFE_METHODS.has(request.method) || !hasCookieToken(request) || hasSameOriginSource(request)
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith('/api/quizzes/check-code')
}

function getCookieToken(request: NextRequest) {
  for (const name of TOKEN_COOKIE_NAMES) {
    const token = request.cookies.get(name)?.value
    if (token) return token
  }
  return undefined
}

function getAuthToken(request: NextRequest) {
  return getCookieToken(request) || request.headers.get('authorization')?.replace('Bearer ', '')
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
  return await redirectLoggedInAdmin(request) || NextResponse.next()
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isStaticPath(pathname)) return NextResponse.next()
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 })
  }
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
