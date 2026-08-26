import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { getSettings, clearSettingsCache } from '@/lib/modules/auth/models/SiteSettings'
import { verifyToken } from '@/lib/modules/auth/auth'
import { safeCompare } from '@/lib/core/security/csrf'
import { 
  checkRateLimit, 
  createRateLimitErrorResponse, 
  RATE_LIMIT_TIERS 
} from '@/lib/core/security/rate-limit/sliding-window'
import { 
  AUTH_COOKIE_NAME, 
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  MAINTENANCE_COOKIE_NAME,
  COOKIE_MAX_AGE
} from '@/lib/core/constants'

// proxy.ts luôn chạy trên Node.js runtime trong Next.js 16 (không cần khai báo)

async function getMaintenanceStatus(): Promise<boolean> {
  try {
    await connectDB()
    const settings = await getSettings()
    return settings.maintenance_mode === true
  } catch {
    return false
  }
}

export function resetMaintenanceCache() {
  clearSettingsCache()
}

const PUBLIC_PATHS = new Set(['/', '/explore', '/login', '/register', '/forgot-password', '/reset-password', '/restore-account', '/terms', '/privacy', '/api/security/csp-report'])
const PUBLIC_API_EXEMPT_CSRF = new Set(['/api/auth/login', '/api/auth/google', '/api/auth/register', '/api/auth/register/send-code', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/restore-account', '/api/auth/logout', '/api/jobs/mail', '/api/jobs/cleanup-deleted-accounts', '/api/security/csp-report'])
const STUDENT_PATHS = ['/dashboard', '/history', '/my-quizzes', '/community', '/profile', '/settings', '/quiz']
const TEACHER_PATHS = ['/teacher']
const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])
const CORS_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
const CORS_HEADERS = `Content-Type, Authorization, ${CSRF_HEADER_NAME}`

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

if (process.env.NODE_ENV === 'production' && !process.env.CORS_ALLOWED_ORIGINS) {
  console.warn('[CORS] CORS_ALLOWED_ORIGINS is not defined in production environment. Cross-origin API requests will be rejected by default.')
}

const defaultCorsOrigins = process.env.NODE_ENV === 'production' ? '' : 'https://fquiz-web.vercel.app'
const corsAllowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS || defaultCorsOrigins)
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

function generateId() {
  return crypto.randomUUID()
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

function isValidRedirectPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.toLowerCase().includes('%2f')
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const loginUrl = new URL('/login', request.url)
  const safePath = isValidRedirectPath(pathname) ? pathname : '/dashboard'
  loginUrl.searchParams.set('callbackUrl', safePath)
  return NextResponse.redirect(loginUrl)
}

function getUnauthorizedOrRedirect(pathname: string, request: NextRequest, requestId: string) {
  if (pathname.startsWith('/api/')) {
    return createUnauthorizedResponse(requestId)
  }
  return redirectToLogin(request, pathname)
}

function isPublicRoute(pathname: string) {
  // Allow viewing quiz detail, mode selection, quiz sessions, and results without auth
  const isPublicQuizFlow = /^\/quiz\/[a-zA-Z0-9_-]+(\/(mode|session\/[a-zA-Z0-9_-]+(\/mobile|\/flashcard(\/mobile)?)?|result\/[a-zA-Z0-9_-]+))?$/.test(pathname)
  // Allow browsing course listing and detail pages without auth
  const isPublicCourse = pathname.startsWith('/courses')
  const isStaticAsset = /\.(png|jpg|jpeg|gif|svg|ico|webp|html|txt|xml)$/i.test(pathname)
  return PUBLIC_PATHS.has(pathname) || isPublicQuizFlow || isPublicCourse || isStaticAsset
}

function shouldSkipAuth(pathname: string, request?: NextRequest) {
  const isPinnedGet = pathname === '/api/student/pinned-categories' && (!request || request.method === 'GET')
  return pathname.startsWith('/api/v1/public/') || 
         pathname.startsWith('/api/v1/explore/') || // optional auth - handles auth internally
         pathname.startsWith('/api/public/') ||
         pathname.startsWith('/api/sessions') || // supports guest & student quiz sessions
         pathname.startsWith('/api/courses/') ||
         pathname.startsWith('/api/auth/') ||
         pathname.startsWith('/api/jobs/') ||
         pathname.startsWith('/api/security/') ||
         pathname.startsWith('/_vercel') ||
         isPinnedGet
}


function validateCsrf(request: NextRequest, pathname: string, requestId: string) {
  const isMutation = MUTATION_METHODS.has(request.method)
  const isExempt = PUBLIC_PATHS.has(pathname) || PUBLIC_API_EXEMPT_CSRF.has(pathname)

  if (!isMutation || isExempt) return null

  const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const csrfHeader = request.headers.get('x-csrf-token')

  if (!csrfCookie || !csrfHeader || !safeCompare(csrfCookie, csrfHeader)) {
    return createCsrfErrorResponse(requestId)
  }

  return null
}

function ensureCsrfCookie(request: NextRequest, response: NextResponse) {
  if (!request.cookies.has(CSRF_COOKIE_NAME)) {
    response.cookies.set(CSRF_COOKIE_NAME, generateId(), {
      path: '/',
      sameSite: 'strict',
      secure: true,
      httpOnly: false,
      maxAge: COOKIE_MAX_AGE,
    })
  }
}

function enforceRoleRouting(pathname: string, role: string, request: NextRequest, requestId: string) {
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (TEACHER_PATHS.some((p) => pathname.startsWith(p)) && !['teacher', 'admin', 'dev'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname.startsWith('/student/classrooms') && role === 'teacher') {
    return NextResponse.redirect(new URL('/teacher/classrooms', request.url))
  }

  if (STUDENT_PATHS.some((p) => pathname.startsWith(p)) && !['student', 'teacher', 'dev'].includes(role)) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  if (pathname.startsWith('/api/admin') && role !== 'admin') {
    return createForbiddenResponse(requestId)
  }

  if (pathname.startsWith('/api/teacher') && !['teacher', 'admin', 'dev'].includes(role)) {
    return createForbiddenResponse(requestId)
  }

  if (pathname.startsWith('/api/v1/ai') && role !== 'dev') {
    return createForbiddenResponse(requestId)
  }

  return null
}

function handleMobileRedirect(request: NextRequest, pathname: string) {
  const quizSessionPattern = /^\/quiz\/[^/]+\/session\/[^/]+(\/flashcard)?$/
  const isMobilePath = pathname.includes('/mobile')

  if (quizSessionPattern.test(pathname) && !isMobilePath) {
    const userAgent = request.headers.get('user-agent') || ''
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)

    if (isMobileDevice) {
      const url = request.nextUrl.clone()
      url.pathname = `${pathname}/mobile`
      return NextResponse.redirect(url)
    }
  }
  return null
}

async function handleMaintenanceMode(request: NextRequest, pathname: string, requestId: string) {
  const isMaintenanceExempt =
    pathname.startsWith('/maintenance') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/_next') ||
    /\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|html|txt|xml)$/i.test(pathname)

  if (isMaintenanceExempt) return null

  let isMaintenanceOn = false
  const maintenanceCookie = request.cookies.get(MAINTENANCE_COOKIE_NAME)?.value

  if (maintenanceCookie === '1') {
    isMaintenanceOn = true
  } else {
    isMaintenanceOn = await getMaintenanceStatus()
  }

  if (!isMaintenanceOn) return null

  const token =
    request.cookies.get(AUTH_COOKIE_NAME)?.value ??
    request.headers.get('Authorization')?.replace('Bearer ', '')

  let isAdmin = false
  if (token) {
    const p = await verifyToken(request)
    isAdmin = p?.role === 'admin'
  }

  if (isAdmin) return null

  if (pathname.startsWith('/api/')) {
    return applyCors(request, NextResponse.json(
      { error: 'Hệ thống đang bảo trì. Vui lòng thử lại sau.' },
      { status: 503, headers: { 'x-request-id': requestId } }
    ))
  }

  const redirectRes = NextResponse.redirect(new URL('/maintenance', request.url))
  redirectRes.cookies.set(MAINTENANCE_COOKIE_NAME, '1', {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30,
  })
  return redirectRes
}

function handleLegacyHistoryRedirect(request: NextRequest, pathname: string) {
  const legacyHistoryMatch = /^\/history\/([a-fA-F0-9]{24})$/.exec(pathname)
  const legacySessionId = request.nextUrl.searchParams.get('sessionId')

  if (legacyHistoryMatch && legacySessionId && /^[a-fA-F0-9]{24}$/.test(legacySessionId)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = `/history/${legacyHistoryMatch[1]}/${legacySessionId}`
    redirectUrl.searchParams.delete('sessionId')
    return applyCors(request, NextResponse.redirect(redirectUrl))
  }
  return null
}

async function handleAuthAndRole(request: NextRequest, pathname: string, requestId: string, response: NextResponse) {
  if (isPublicRoute(pathname) || shouldSkipAuth(pathname, request)) {
    return response
  }

  const payload = await verifyToken(request)
  if (!payload) {
    return applyCors(request, getUnauthorizedOrRedirect(pathname, request, requestId))
  }

  const role = typeof payload.role === 'string' ? payload.role : ''
  const roleResponse = enforceRoleRouting(pathname, role, request, requestId)
  if (roleResponse) return applyCors(request, roleResponse)

  return applyCors(request, response)
}

function getRateLimitTier(request: NextRequest, pathname: string) {
  if (
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/register') ||
    pathname.startsWith('/api/auth/forgot-password') ||
    pathname.startsWith('/api/auth/reset-password')
  ) {
    return RATE_LIMIT_TIERS.AUTH_STRICT
  }
  if (
    pathname.startsWith('/api/v1/ai') ||
    pathname.startsWith('/api/import/') ||
    pathname.startsWith('/api/admin/settings/test-llm')
  ) {
    return RATE_LIMIT_TIERS.AI_GENERATE
  }
  if (
    pathname.startsWith('/api/search') ||
    pathname.startsWith('/api/v1/search') ||
    pathname.startsWith('/api/question-bank/check')
  ) {
    return RATE_LIMIT_TIERS.SEARCH_HEAVY
  }
  if (pathname.startsWith('/api/sessions/')) {
    return RATE_LIMIT_TIERS.QUIZ_SESSION
  }
  if (MUTATION_METHODS.has(request.method)) {
    return RATE_LIMIT_TIERS.MUTATION_STANDARD
  }
  const isAuthenticated = Boolean(
    request.cookies.get(AUTH_COOKIE_NAME)?.value ??
    request.headers.get('authorization')
  )
  return isAuthenticated ? RATE_LIMIT_TIERS.PUBLIC_READ_AUTH : RATE_LIMIT_TIERS.PUBLIC_READ_GUEST
}

function handleGlobalRateLimit(request: NextRequest, pathname: string): NextResponse | null {
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/jobs/') || pathname.startsWith('/api/security/')) return null
  const tier = getRateLimitTier(request, pathname)
  const status = checkRateLimit(request, tier)
  return status.success ? null : createRateLimitErrorResponse(status)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const requestId = request.headers.get('x-request-id') || generateId()

  if (pathname.startsWith('/_vercel') || pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  const mobileRedirect = handleMobileRedirect(request, pathname)
  if (mobileRedirect) return mobileRedirect

  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 })
    preflight.headers.set('x-request-id', requestId)
    return applyCors(request, preflight)
  }

  const maintenanceResponse = await handleMaintenanceMode(request, pathname, requestId)
  if (maintenanceResponse) return maintenanceResponse

  // API Rate Limiting Evaluation (Layer 1 Defense against DoS & Flooding)
  const rateLimitResponse = handleGlobalRateLimit(request, pathname)
  if (rateLimitResponse) return applyCors(request, rateLimitResponse)

  const deployTarget = process.env.DEPLOY_TARGET
  if (deployTarget === 'api' && !pathname.startsWith('/api/')) {
    return applyCors(request, NextResponse.json({ error: 'Not Found' }, { status: 404, headers: { 'x-request-id': requestId } }))
  }

  const legacyRedirect = handleLegacyHistoryRedirect(request, pathname)
  if (legacyRedirect) return legacyRedirect

  const response = NextResponse.next()
  response.headers.set('x-request-id', requestId)
  applyCors(request, response)

  const csrfError = validateCsrf(request, pathname, requestId)
  if (csrfError) return applyCors(request, csrfError)

  ensureCsrfCookie(request, response)

  return handleAuthAndRole(request, pathname, requestId, response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot|html|txt|xml)$).*)'],
}
