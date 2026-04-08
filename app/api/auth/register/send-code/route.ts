import { NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { EmailVerification } from '@/models/EmailVerification'
import { rateLimiter } from '@/lib/rate-limit/provider'
import { logSecurityEvent } from '@/lib/logger'
import { generateVerificationCode, hashVerificationCode } from '@/lib/verification-code'
import { isMailConfigured, sendVerificationCodeMail } from '@/lib/mail'

const Schema = z.object({ email: z.email().max(254) })

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') || 'unknown'
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const route = '/api/auth/register/send-code'

  try {
    const ipLimit = await rateLimiter.check(`register_send_code_ip_${ip}`)
    if (!ipLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const email = parsed.data.email.toLowerCase().trim()

    await connectDB()

    const existingUser = await User.findOne({ email }).select('_id').lean()
    if (existingUser) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 409 })
    }

    const now = new Date()
    const existingCode = await EmailVerification.findOne({ email, purpose: 'register', used: false }).lean()
    if (existingCode?.resend_available_at && new Date(existingCode.resend_available_at) > now) {
      const retryAfterSec = Math.ceil((new Date(existingCode.resend_available_at).getTime() - now.getTime()) / 1000)
      return NextResponse.json({ error: 'Please wait before requesting a new code', retryAfterSec }, { status: 429 })
    }

    const code = generateVerificationCode()
    const codeHash = hashVerificationCode(code)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    const resendAvailableAt = new Date(Date.now() + 60 * 1000)

    await EmailVerification.findOneAndUpdate(
      { email, purpose: 'register' },
      {
        $set: {
          code_hash: codeHash,
          expires_at: expiresAt,
          resend_available_at: resendAvailableAt,
          attempts: 0,
          used: false,
        },
      },
      { upsert: true, new: true }
    )

    if (isMailConfigured()) {
      await sendVerificationCodeMail({ to: email, code, purpose: 'register' })
    }

    logSecurityEvent('register_code_sent', {
      request_id: requestId,
      route,
      outcome: 'success',
      ip,
      email,
    }, 'Registration verification code sent')

    // In development without SMTP, return the code for local testing.
    if (!isMailConfigured() && process.env.NODE_ENV === 'development') {
      return NextResponse.json({ message: 'Verification code generated (dev mode).', dev_code: code }, { status: 200 })
    }

    return NextResponse.json({ message: 'Verification code sent' }, { status: 200 })
  } catch (err) {
    logSecurityEvent('register_code_error', {
      request_id: requestId,
      route,
      outcome: 'error',
      ip,
      err: err instanceof Error ? err.message : 'Unknown',
    }, 'Failed to send register verification code')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
