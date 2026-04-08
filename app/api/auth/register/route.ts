import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { RegisterSchema } from '@/lib/schemas'
import { User } from '@/models/User'
import { EmailVerification } from '@/models/EmailVerification'
import { rateLimiter } from '@/lib/rate-limit/provider'
import { logSecurityEvent } from '@/lib/logger'
import { isMailConfigured, sendRegistrationMail } from '@/lib/mail'
import { hashVerificationCode, isValidVerificationCode } from '@/lib/verification-code'

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') || 'unknown'
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const route = '/api/auth/register'

  try {
    const rateLimit = await rateLimiter.check(`register_${ip}`)
    if (!rateLimit.success) {
      logSecurityEvent('rate_limit_triggered', { request_id: requestId, route, outcome: 'denied', ip }, 'Register rate limit reached')
      return NextResponse.json({ error: 'Too many registration attempts' }, { status: 429 })
    }

    await connectDB()

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const result = RegisterSchema.safeParse(body)
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'unknown',
        message: issue.message,
      }))
      return NextResponse.json(
        { error: 'Validation failed', details },
        { status: 400 }
      )
    }

    const bodyWithCode = body as { verificationCode?: unknown }
    const verificationCode = typeof bodyWithCode.verificationCode === 'string' ? bodyWithCode.verificationCode.trim() : ''
    if (!isValidVerificationCode(verificationCode)) {
      return NextResponse.json({ error: 'Mã xác thực không hợp lệ' }, { status: 400 })
    }

    const { username, email, password } = result.data
    const normalizedEmail = email.toLowerCase().trim()

    const existingEmail = await User.findOne({ email: normalizedEmail })
    if (existingEmail) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 409 })
    }

    const codeRecord = await EmailVerification.findOne({
      email: normalizedEmail,
      purpose: 'register',
      used: false,
      expires_at: { $gt: new Date() },
    })

    if (!codeRecord) {
      return NextResponse.json({ error: 'Mã xác thực đã hết hạn hoặc không tồn tại' }, { status: 400 })
    }

    const expectedHash = hashVerificationCode(verificationCode)
    if (codeRecord.code_hash !== expectedHash) {
      await EmailVerification.updateOne(
        { _id: codeRecord._id },
        { $inc: { attempts: 1 } }
      )
      return NextResponse.json({ error: 'Mã xác thực không đúng' }, { status: 400 })
    }

    // Case-insensitive username check
    const existingUsername = await User.findOne({ username: { $regex: new RegExp(`^${username.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })
    if (existingUsername) {
      return NextResponse.json({ error: 'Username đã được sử dụng' }, { status: 409 })
    }

    const password_hash = await bcrypt.hash(password, 10)
    const newUser = await User.create({ 
      username: username.trim(), 
      email: normalizedEmail, 
      password_hash, 
      role: 'student',
      token_version: 1 
    })

    await EmailVerification.updateOne(
      { _id: codeRecord._id },
      { $set: { used: true } }
    )

    logSecurityEvent('user_registered', {
      request_id: requestId,
      user_id: newUser._id.toString(),
      route,
      outcome: 'success',
      ip
    }, `New user ${username} registered`)

    // Registration should not fail if mail provider is temporarily unavailable.
    if (isMailConfigured()) {
      sendRegistrationMail({
        to: newUser.email,
        username: newUser.username,
      }).catch((mailErr) => {
        logSecurityEvent('registration_mail_failed', {
          request_id: requestId,
          user_id: newUser._id.toString(),
          route,
          outcome: 'error',
          ip,
          err: mailErr instanceof Error ? mailErr.message : 'Unknown mail error',
        }, 'Registration email failed to send')
      })
    }

    return NextResponse.json({ message: 'Account created' }, { status: 201 })
  } catch (err) {
    logSecurityEvent('register_error', {
      request_id: requestId,
      route,
      outcome: 'error',
      ip,
      err: err instanceof Error ? err.message : 'Unknown',
    }, 'Register handler unexpected error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
