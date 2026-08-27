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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignore static assets & Next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // Allow public paths
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/api/quizzes/check-code')) {
    // If already logged in as admin and visiting /login, redirect to /
    if (pathname === '/login') {
      const token =
        request.cookies.get(AUTH_COOKIE_NAME)?.value ||
        request.cookies.get('auth-token')?.value ||
        request.cookies.get('token')?.value
      if (token) {
        const payload = await decrypt(token)
        if (payload && payload.role === 'admin') {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }
    }
    return NextResponse.next()
  }

  // Verify auth token
  const token =
    request.cookies.get(AUTH_COOKIE_NAME)?.value ||
    request.cookies.get('auth-token')?.value ||
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const payload = await decrypt(token)
  if (!payload || payload.role !== 'admin') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
    }
    const loginUrl = new URL('/login', request.url)
    const res = NextResponse.redirect(loginUrl)
    res.cookies.delete(AUTH_COOKIE_NAME)
    return res
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-admin-id', payload.userId)
  requestHeaders.set('x-admin-role', payload.role)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
