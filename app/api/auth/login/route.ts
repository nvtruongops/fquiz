import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { LoginSchema } from '@/lib/schemas'
import { signToken } from '@/lib/auth'
import { User } from '@/models/User'
import { LoginLog } from '@/models/LoginLog'
import { getSettings } from '@/models/SiteSettings'
import { rateLimiter } from '@/lib/rate-limit/provider'
import { logSecurityEvent } from '@/lib/logger'

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') || 'unknown'
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const route = '/api/auth/login'

  try {
    const rateLimit = await rateLimiter.check(`login_${ip}`)
    if (!rateLimit.success) {
      logSecurityEvent('rate_limit_triggered', { request_id: requestId, route, outcome: 'denied', ip }, 'Login rate limit reached')
      return NextResponse.json(
        { error: 'Quá nhiều lần thử. Vui lòng thử lại sau 1 phút.' },
        { status: 429 }
      )
    }

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const result = LoginSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ thông tin đăng nhập' },
        { status: 400 }
      )
    }

    const { identifier, password } = result.data
    await connectDB()

    // Support login by email OR username
    const isEmail = identifier.includes('@')
    const user = isEmail
      ? await User.findOne({ email: identifier.toLowerCase().trim() })
      : await User.findOne({ username: identifier.trim() }) // Assuming username is exact match now for security

    if (!user) {
      logSecurityEvent('login_failed', { request_id: requestId, route, outcome: 'failure', ip, identifier }, 'User not found')
      return NextResponse.json({ error: 'Thông tin đăng nhập không đúng' }, { status: 401 })
    }

    if (user.status === 'banned') {
      return NextResponse.json(
        { error: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' },
        { status: 403 }
      )
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      logSecurityEvent('login_failed', { request_id: requestId, user_id: user._id.toString(), route, outcome: 'failure', ip }, 'Invalid password')
      return NextResponse.json({ error: 'Thông tin đăng nhập không đúng' }, { status: 401 })
    }

    // Record login log
    LoginLog.create({ user_id: user._id, ip, user_agent: userAgent }).catch(() => {})

    // Anti-sharing detection (Simplified for now)
    try {
      const settings = await getSettings()
      if (settings.anti_sharing_enabled && user.role === 'student' && user.sharing_violations >= settings.anti_sharing_max_violations) {
        await User.findByIdAndUpdate(user._id, { status: 'banned', ban_reason: 'anti_sharing' })
        return NextResponse.json({ error: 'Tài khoản đã bị khóa do vi phạm chia sẻ.' }, { status: 403 })
      }
    } catch {}

    const token = await signToken(user._id.toString(), user.role, user.token_version || 1, {
      username: user.username,
      avatarUrl: user.avatar_url || '',
    })
    
    logSecurityEvent('login_success', {
      request_id: requestId,
      user_id: user._id.toString(),
      route,
      outcome: 'success',
      ip
    }, `User ${user.username} logged in successfully`)

    const response = NextResponse.json({ token, role: user.role }, { status: 200 })

    const authCookieDomain = process.env.AUTH_COOKIE_DOMAIN

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
      ...(authCookieDomain ? { domain: authCookieDomain } : {}),
    })

    return response
  } catch (err) {
    logSecurityEvent('login_error', { 
      request_id: requestId, 
      user_id: 'unknown', 
      route, 
      outcome: 'error', 
      ip, 
      err: err instanceof Error ? err.message : 'Unknown' 
    }, 'Login handler unexpected error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
