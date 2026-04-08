import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { z } from 'zod'
import crypto from 'node:crypto'
import { rateLimiter } from '@/lib/rate-limit/provider'
import { logSecurityEvent } from '@/lib/logger'
import { hashVerificationCode, isValidVerificationCode } from '@/lib/verification-code'

const TokenSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const CodeSchema = z.object({
  email: z.email(),
  code: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') || 'unknown'
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const route = '/api/auth/reset-password'

  try {
    const rateLimit = await rateLimiter.check(`reset_pass_${ip}`)
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
    }

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const bodyObj = body as Record<string, unknown>
    const isCodeFlow = typeof bodyObj.email === 'string' && typeof bodyObj.code === 'string'

    let password: string
    let user: Awaited<ReturnType<typeof User.findOne>>
    await connectDB()

    if (isCodeFlow) {
      const parsed = CodeSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
      }

      const normalizedEmail = parsed.data.email.toLowerCase().trim()
      if (!isValidVerificationCode(parsed.data.code.trim())) {
        return NextResponse.json({ error: 'Mã xác thực không hợp lệ' }, { status: 400 })
      }

      const codeHash = hashVerificationCode(parsed.data.code.trim())
      password = parsed.data.password

      user = await User.findOne({
        email: normalizedEmail,
        reset_token: codeHash,
        reset_token_expires: { $gt: new Date() },
      })
    } else {
      const parsed = TokenSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
      }

      password = parsed.data.password
      const hashedToken = crypto.createHash('sha256').update(parsed.data.token).digest('hex')

      user = await User.findOne({
        reset_token: hashedToken,
        reset_token_expires: { $gt: new Date() },
      })
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(password, 10)

    // Revoke token immediately and update password
    await User.updateOne(
      { _id: user._id },
      { 
        password_hash, 
        reset_token: null, 
        reset_token_expires: null,
        $inc: { token_version: 1 } // Invalidate all existing sessions on password reset
      }
    )

    logSecurityEvent('password_reset_success', {
      request_id: requestId,
      user_id: user._id.toString(),
      route,
      outcome: 'success',
      ip
    }, 'Password successfully reset')

    return NextResponse.json({ message: 'Password reset successful' })
  } catch (err) {
    logSecurityEvent('password_reset_error', {
      request_id: requestId,
      route,
      outcome: 'error',
      ip,
      err: err instanceof Error ? err.message : 'Unknown error',
    }, 'Reset password request failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
