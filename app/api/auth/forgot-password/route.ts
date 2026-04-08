import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { z } from 'zod'
import { rateLimiter } from '@/lib/rate-limit/provider'
import { logSecurityEvent } from '@/lib/logger'
import { isMailConfigured, sendVerificationCodeMail } from '@/lib/mail'
import { generateVerificationCode, hashVerificationCode, isValidVerificationCode } from '@/lib/verification-code'

const SendSchema = z.object({
  action: z.literal('send').optional(),
  email: z.email(),
})

const VerifySchema = z.object({
  action: z.literal('verify'),
  email: z.email(),
  code: z.string(),
})

async function handleVerify(body: unknown, ip: string) {
  const verifyParsed = VerifySchema.safeParse(body)
  if (!verifyParsed.success) {
    return NextResponse.json({ error: 'Invalid verification payload' }, { status: 400 })
  }

  const verifyLimit = await rateLimiter.check(`forgot_verify_${ip}`)
  if (!verifyLimit.success) {
    return NextResponse.json({ error: 'Too many verification attempts' }, { status: 429 })
  }

  const email = verifyParsed.data.email.toLowerCase().trim()
  const code = verifyParsed.data.code.trim()

  if (!isValidVerificationCode(code)) {
    return NextResponse.json({ error: 'Mã xác thực không hợp lệ' }, { status: 400 })
  }

  const user = await User.findOne({ email }).select('_id reset_token reset_token_expires').lean()
  const isExpired = !user?.reset_token_expires || new Date(user.reset_token_expires) <= new Date()
  if (!user?.reset_token || isExpired) {
    return NextResponse.json({ error: 'Mã xác thực đã hết hạn hoặc không tồn tại' }, { status: 400 })
  }

  const codeHash = hashVerificationCode(code)
  if (user.reset_token !== codeHash) {
    return NextResponse.json({ error: 'Mã xác thực không đúng' }, { status: 400 })
  }

  return NextResponse.json({ message: 'Code verified', verified: true }, { status: 200 })
}

async function handleSend(
  body: unknown,
  requestId: string,
  ip: string,
  route: string
) {
  const genericMessage = 'If that email exists, a verification code has been sent.'
  const sendParsed = SendSchema.safeParse(body)
  if (!sendParsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const sendLimit = await rateLimiter.check(`forgot_send_${ip}`)
  if (!sendLimit.success) {
    return NextResponse.json({ error: 'Too many reset requests' }, { status: 429 })
  }

  const email = sendParsed.data.email.toLowerCase().trim()
  const user = await User.findOne({ email })

  if (!user) {
    return NextResponse.json({ message: genericMessage })
  }

  const now = Date.now()
  const resendAvailableAt = user.reset_token_expires
    ? new Date(user.reset_token_expires).getTime() - 9 * 60 * 1000
    : 0

  if (resendAvailableAt > now) {
    const retryAfterSec = Math.ceil((resendAvailableAt - now) / 1000)
    return NextResponse.json({ error: 'Please wait before requesting a new code', retryAfterSec }, { status: 429 })
  }

  const code = generateVerificationCode()
  const hashedCode = hashVerificationCode(code)
  const expires = new Date(now + 10 * 60 * 1000)

  await User.updateOne(
    { _id: user._id },
    { reset_token: hashedCode, reset_token_expires: expires }
  )

  logSecurityEvent('password_reset_requested', {
    request_id: requestId,
    user_id: user._id.toString(),
    route,
    outcome: 'success',
    ip
  }, `Password reset token generated for ${user.email}`)

  if (isMailConfigured()) {
    await sendVerificationCodeMail({ to: user.email, code, purpose: 'reset-password' })
    return NextResponse.json({ message: genericMessage })
  }

  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({
      message: genericMessage,
      dev_code: code,
    })
  }

  return NextResponse.json({ message: genericMessage })
}

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') || 'unknown'
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const route = '/api/auth/forgot-password'

  try {
    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const action = (body as { action?: unknown })?.action
    await connectDB()

    if (action === 'verify') {
      return handleVerify(body, ip)
    }

    return handleSend(body, requestId, ip, route)
  } catch (err) {
    logSecurityEvent('forgot_password_error', {
      request_id: requestId,
      route,
      outcome: 'error',
      ip,
      err: err instanceof Error ? err.message : 'Unknown',
    }, 'Forgot password handler error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
