import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'
import { clearUserStatusCache } from '@/lib/modules/auth/auth'
import { z } from 'zod'
import crypto from 'node:crypto'
import type { Types } from 'mongoose'
import { rateLimiter } from '@/lib/core/security/rate-limit/provider'
import { getRequestMetadata } from '@/lib/core/security/request-metadata'
import { logSecurityEvent } from '@/lib/core/utils/logger'
import { hashVerificationCode, isValidVerificationCode } from '@/lib/modules/auth/verification-code'
import { buildTokenVersionUpdate } from '@/lib/modules/auth/token-version-update'
import { incrementFailedResetTokenAttempts } from '@/lib/modules/auth/reset-token-attempts'

const TokenSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const CodeSchema = z.object({
  email: z.email(),
  code: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type ResetUser = { _id: Types.ObjectId; token_version?: number }
type CodeResetUser = ResetUser & { reset_token?: string; reset_token_expires?: Date; reset_token_attempts?: number }
type ResetCredentials = { user: ResetUser; password: string } | { response: NextResponse }

async function parseCodeResetInput(body: unknown): Promise<{ data: z.infer<typeof CodeSchema> } | { response: NextResponse }> {
  const parsed = CodeSchema.safeParse(body)
  if (!parsed.success) {
    return { response: NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 }) }
  }
  const code = parsed.data.code.trim()
  if (!isValidVerificationCode(code)) {
    return { response: NextResponse.json({ error: 'Invalid verification code' }, { status: 400 }) }
  }
  return { data: { ...parsed.data, email: parsed.data.email.toLowerCase().trim(), code } }
}

async function getCodeResetCredentials(body: unknown): Promise<ResetCredentials> {
  const input = await parseCodeResetInput(body)
  if ('response' in input) return input

  const { data } = input
  const userResult = await findCodeResetUser(data.email)
  if ('response' in userResult) return userResult
  const validationResponse = await getCodeResetValidationResponse(userResult.user, data.code)
  if (validationResponse) return { response: validationResponse }
  return { user: userResult.user, password: data.password }
}

async function findCodeResetUser(email: string): Promise<{ user: CodeResetUser } | { response: NextResponse }> {
  const user = await User.findOne({ email })
    .select('_id reset_token reset_token_expires reset_token_attempts token_version').lean()
  return user
    ? { user }
    : { response: NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 }) }
}

async function getCodeResetValidationResponse(user: CodeResetUser, code: string): Promise<NextResponse | null> {
  if (hasExceededResetCodeAttempts(user)) return getResetAttemptLimitResponse()
  if (isValidResetCode(user, code)) return null

  await recordFailedResetCodeAttempt(user)
  return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
}

function hasExceededResetCodeAttempts(user: CodeResetUser) {
  return (user.reset_token_attempts || 0) >= 5
}

function getResetAttemptLimitResponse() {
  return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 })
}

function isValidResetCode(user: CodeResetUser, code: string) {
  const codeHash = hashVerificationCode(code)
  const isExpired = !user.reset_token_expires || new Date(user.reset_token_expires) <= new Date()
  return user.reset_token === codeHash && !isExpired
}

async function recordFailedResetCodeAttempt(user: CodeResetUser) {
  await incrementFailedResetTokenAttempts(user._id, user.reset_token)
}

async function getTokenResetCredentials(body: unknown): Promise<ResetCredentials> {
  const parsed = TokenSchema.safeParse(body)
  if (!parsed.success) {
    return { response: NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 }) }
  }
  const hashedToken = crypto.createHash('sha256').update(parsed.data.token).digest('hex')
  const user = await User.findOne({
    reset_token: hashedToken,
    reset_token_expires: { $gt: new Date() },
  }).select('_id token_version').lean()
  return user
    ? { user, password: parsed.data.password }
    : { response: NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 }) }
}

async function getResetCredentials(body: unknown): Promise<ResetCredentials> {
  const bodyObj = body as Record<string, unknown>
  const isCodeFlow = typeof bodyObj.email === 'string' && typeof bodyObj.code === 'string'
  return isCodeFlow ? getCodeResetCredentials(body) : getTokenResetCredentials(body)
}

async function updateResetPassword(user: ResetUser, password: string): Promise<NextResponse> {
  const password_hash = await bcrypt.hash(password, 12)
  const tokenVersionUpdate = buildTokenVersionUpdate(user.token_version)
  const update = await User.updateOne(
    { _id: user._id, ...tokenVersionUpdate.versionFilter },
    {
      $set: {
        password_hash,
        reset_token: null,
        reset_token_expires: null,
        reset_token_attempts: 0,
        token_version: tokenVersionUpdate.nextVersion,
      },
    }
  )
  if (update.matchedCount !== 1) {
    return NextResponse.json({ error: 'Account changed. Request a new reset code.' }, { status: 409 })
  }
  clearUserStatusCache(user._id.toString())
  return NextResponse.json({ message: 'Password reset successful' })
}

export async function POST(request: Request) {
  const { requestId, ip, route } = getRequestMetadata(request, '/api/auth/reset-password')

  try {
    const rateLimit = await rateLimiter.check(`reset_pass_${ip}`)
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    await connectDB()
    const credentials = await getResetCredentials(body)
    if ('response' in credentials) return credentials.response
    const response = await updateResetPassword(credentials.user, credentials.password)
    if (response.status !== 200) return response

    logSecurityEvent('password_reset_success', {
      request_id: requestId,
      user_id: credentials.user._id.toString(),
      route,
      outcome: 'success',
      ip
    }, 'Password successfully reset')

    return response
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
