import { NextResponse } from 'next/server'
import { getClientIp } from '@fquiz/auth'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/core/db/mongodb'
import { RegisterSchema } from '@/lib/modules/auth/schemas/auth'
import { User } from '@/lib/modules/auth/models/User'
import { EmailVerification } from '@/lib/modules/auth/models/EmailVerification'
import { rateLimiter } from '@/lib/core/security/rate-limit/provider'
import { logSecurityEvent } from '@/lib/core/utils/logger'
import { hashVerificationCode, isValidVerificationCode } from '@/lib/modules/auth/verification-code'

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') || 'unknown'
  const ip = getClientIp(request)
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
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    const { username, email, password } = result.data
    const normalizedEmail = email.toLowerCase().trim()

    const codeRecord = await EmailVerification.findOne({
      email: normalizedEmail,
      purpose: 'register',
      used: false,
      expires_at: { $gt: new Date() },
    })

    if (!codeRecord) {
      return NextResponse.json({ error: 'Verification code expired or does not exist' }, { status: 400 })
    }

    if (codeRecord.attempts >= 5) {
      return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 })
    }

    const expectedHash = hashVerificationCode(verificationCode)
    if (codeRecord.code_hash !== expectedHash) {
      await EmailVerification.updateOne(
        {
          _id: codeRecord._id,
          code_hash: codeRecord.code_hash,
          used: false,
          expires_at: { $gt: new Date() },
          $or: [
            { attempts: { $lt: 5 } },
            { attempts: { $exists: false } },
          ],
        },
        { $inc: { attempts: 1 } }
      )
      return NextResponse.json({ error: 'Incorrect verification code' }, { status: 400 })
    }

    const existingEmail = await User.findOne({ email: normalizedEmail })
    if (existingEmail) {
      return NextResponse.json({ error: 'Unable to create an account with these details' }, { status: 400 })
    }

    // Case-insensitive username check
    const existingUsername = await User.findOne({ 
      username_lower: username.toLowerCase().trim() 
    })
    if (existingUsername) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
    }

    const password_hash = await bcrypt.hash(password, 12)
    const newUser = await User.create({ 
      username: username.trim(), 
      username_lower: username.toLowerCase().trim(),
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
