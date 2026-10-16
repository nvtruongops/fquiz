import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'
import { clearUserStatusCache } from '@/lib/modules/auth/auth'
import { enqueueMail } from '@/lib/core/mail/mail'
import { resolveAppBaseUrl } from '@/lib/core/utils/url-utils'

export const dynamic = 'force-dynamic'

const RequestDeletionSchema = z.object({
  password: z.string().min(1, 'Please enter confirmation password'),
})

export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const parsed = RequestDeletionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Confirmation password is required' }, { status: 400 })
    }

    const { password } = parsed.data

    await connectDB()
    const user = await User.findById(payload.userId).select('+password_hash')
    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (user.status === 'pending_deletion') {
      return NextResponse.json({ error: 'A deletion request has already been submitted for your account' }, { status: 400 })
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Incorrect confirmation password' }, { status: 400 })
    }

    // Generate random recovery token & calculate 72 hours from now
    const deletionToken = crypto.randomBytes(32).toString('hex')
    const now = new Date()
    const scheduledFor = new Date(now.getTime() + 72 * 60 * 60 * 1000)

    user.status = 'pending_deletion'
    user.deletion_requested_at = now
    user.deletion_scheduled_for = scheduledFor
    user.deletion_token = deletionToken
    user.deletion_token_expires = scheduledFor
    user.token_version = (user.token_version || 1) + 1
    await user.save()

    clearUserStatusCache(payload.userId)

    const baseUrl = resolveAppBaseUrl(req)
    const restoreUrl = `${baseUrl}/restore-account?token=${deletionToken}`

    await enqueueMail('account-deletion-notice', {
      to: user.email,
      username: user.username,
      restoreUrl,
      scheduledFor: scheduledFor.toISOString(),
    })

    const response = NextResponse.json({
      success: true,
      message: 'Account deletion request submitted successfully. An email with recovery instructions has been sent.',
    })

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (err) {
    console.error('POST /api/student/account/request-deletion error:', err)
    return NextResponse.json({ error: 'Internal server error while processing account deletion' }, { status: 500 })
  }
}, { roles: ['student', 'admin', 'dev'] })
