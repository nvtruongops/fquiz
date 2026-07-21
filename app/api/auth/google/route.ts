import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { signToken } from '@/lib/modules/auth/auth'
import { User } from '@/lib/modules/auth/models/User'
import { LoginLog } from '@/lib/modules/auth/models/LoginLog'
import { rateLimiter } from '@/lib/core/security/rate-limit/provider'
import { logSecurityEvent } from '@/lib/core/utils/logger'

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') || 'unknown'
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const route = '/api/auth/google'

  const contentType = request.headers.get('content-type') || ''
  const isFormSubmit = contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')

  const url = new URL(request.url)
  const rawCallbackUrl = url.searchParams.get('callbackUrl')
  let callbackUrl: string | null = null
  if (rawCallbackUrl && rawCallbackUrl.startsWith('/') && !rawCallbackUrl.startsWith('//')) {
    callbackUrl = rawCallbackUrl
  }

  const handleError = (errorMsg: string, status: number) => {
    if (isFormSubmit) {
      const loginRedirect = new URL('/login', request.url)
      loginRedirect.searchParams.set('reason', 'google_auth_failed')
      loginRedirect.searchParams.set('error', errorMsg)
      if (callbackUrl) loginRedirect.searchParams.set('callbackUrl', callbackUrl)
      return NextResponse.redirect(loginRedirect, 303)
    }
    return NextResponse.json({ error: errorMsg }, { status })
  }

  try {
    const rateLimit = await rateLimiter.check(`google_auth_${ip}`)
    if (!rateLimit.success) {
      logSecurityEvent('rate_limit_triggered', { request_id: requestId, route, outcome: 'denied', ip }, 'Google auth rate limit reached')
      return handleError('Quá nhiều lần thử. Vui lòng thử lại sau 1 phút.', 429)
    }

    let credential = ''
    if (isFormSubmit) {
      const formData = await request.formData()
      credential = (formData.get('credential') || formData.get('id_token') || '').toString()
    } else {
      try {
        const body = await request.json()
        credential = body?.credential || body?.idToken || body?.id_token || ''
      } catch {
        return handleError('Dữ liệu không hợp lệ', 400)
      }
    }

    if (!credential) {
      return handleError('Mã xác thực Google không hợp lệ', 400)
    }

    // Verify ID Token via Google API TokenInfo endpoint
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
    if (!googleRes.ok) {
      logSecurityEvent('google_auth_failed', { request_id: requestId, route, outcome: 'failure', ip }, 'Google token verification failed')
      return handleError('Xác thực Google không thành công hoặc token đã hết hạn', 401)
    }

    const payload = await googleRes.json()

    // Validate email verification and Google Issuer
    const isValidIssuer = payload.iss === 'accounts.google.com' || payload.iss === 'https://accounts.google.com'
    const isEmailVerified = payload.email_verified === true || payload.email_verified === 'true'

    if (!isValidIssuer || !isEmailVerified || !payload.email || !payload.sub) {
      return handleError('Tài khoản Google chưa được xác minh email', 400)
    }

    await connectDB()

    const emailClean = payload.email.toLowerCase().trim()
    const googleId = payload.sub
    const avatarUrl = payload.picture || null

    // 1. Check existing user by google_id
    let user = await User.findOne({ google_id: googleId })

    // 2. If not found by google_id, check by email (case-insensitive) to merge accounts
    if (!user) {
      user = await User.findOne({
        $or: [
          { email: emailClean },
          { email: { $regex: new RegExp(`^${emailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
        ]
      })

      if (user) {
        // Automatically merge/link google_id to existing account
        user.google_id = googleId
        if (!user.avatar_url && avatarUrl) {
          user.avatar_url = avatarUrl
        }
        await user.save()

        logSecurityEvent('google_account_linked', {
          request_id: requestId,
          user_id: user._id.toString(),
          route,
          outcome: 'success',
          email: emailClean,
        }, `Linked Google ID ${googleId} to existing user account ${user.username}`)
      }
    }

    // 3. If still not found, auto-create new Google OAuth user
    if (!user) {
      const emailPrefix = emailClean.split('@')[0].replace(/[^\w]/g, '')
      let baseUsername = emailPrefix.substring(0, 12)
      if (baseUsername.length < 3) {
        baseUsername = `user_${baseUsername}`
      }

      let candidateUsername = baseUsername
      let isUnique = false
      let attempts = 0

      while (!isUnique && attempts < 10) {
        const existing = await User.findOne({ username_lower: candidateUsername.toLowerCase() })
        if (!existing) {
          isUnique = true
        } else {
          const randSuffix = Math.floor(100 + Math.random() * 900)
          candidateUsername = `${baseUsername.substring(0, 10)}${randSuffix}`
          attempts++
        }
      }

      user = await User.create({
        username: candidateUsername,
        username_lower: candidateUsername.toLowerCase(),
        email: emailClean,
        password_hash: '$oauth_google_protected$',
        google_id: googleId,
        avatar_url: avatarUrl,
        role: 'student',
        status: 'active',
        created_at: new Date(),
        token_version: 1,
      })
    }

    // Status check
    if (user.status === 'banned') {
      return handleError('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.', 403)
    }

    if (user.status === 'pending_deletion') {
      return handleError(
        'Tài khoản của bạn đang trong thời gian chờ xóa (72h). Vui lòng kiểm tra email và bấm vào liên kết khôi phục để kích hoạt lại tài khoản trước khi đăng nhập.',
        403
      )
    }

    // Record login log
    LoginLog.create({ user_id: user._id, ip, user_agent: userAgent }).catch((logErr) =>
      console.warn('[LoginLog] Failed to record Google login:', logErr)
    )

    const token = await signToken(user._id.toString(), user.role, user.token_version || 1, {
      username: user.username,
      avatarUrl: user.avatar_url || '',
    })

    logSecurityEvent(
      'login_success',
      {
        request_id: requestId,
        user_id: user._id.toString(),
        route,
        outcome: 'success',
        ip,
        provider: 'google',
      },
      `User ${user.username} logged in via Google`
    )

    const targetUrl = callbackUrl || (user.role === 'admin' ? '/admin' : '/dashboard')
    const authCookieDomain = process.env.AUTH_COOKIE_DOMAIN

    let response: NextResponse
    if (isFormSubmit) {
      response = NextResponse.redirect(new URL(targetUrl, request.url), 303)
    } else {
      response = NextResponse.json(
        {
          token,
          role: user.role,
          user: {
            _id: user._id.toString(),
            name: user.username,
            role: user.role,
            avatarUrl: user.avatar_url || '',
          },
        },
        { status: 200 }
      )
    }

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
      ...(authCookieDomain ? { domain: authCookieDomain } : {}),
    })

    return response
  } catch (err) {
    logSecurityEvent(
      'login_error',
      {
        request_id: requestId,
        user_id: 'unknown',
        route,
        outcome: 'error',
        ip,
        err: err instanceof Error ? err.message : 'Unknown',
      },
      'Google auth handler unexpected error'
    )
    return handleError('Hệ thống đang bận, vui lòng thử lại sau.', 500)
  }
}
