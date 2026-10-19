import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { clearUserStatusCache } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'

export const dynamic = 'force-dynamic'

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Please enter current password'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(50, 'New password is too long'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
})

export const PATCH = withAuth(async (req: Request, { payload }) => {
  try {
    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = ChangePasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = parsed.data

    await connectDB()
    const user = await User.findById(payload.userId).select('password_hash token_version')
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const currentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!currentPasswordValid) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 })
    }

    const password_hash = await bcrypt.hash(newPassword, 10)
    await User.findByIdAndUpdate(payload.userId, {
      $set: { password_hash },
      $inc: { token_version: 1 },
    })
    clearUserStatusCache(payload.userId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })