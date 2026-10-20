import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { clearUserStatusCache } from '@/lib/modules/auth/auth'
import { buildTokenVersionUpdate } from '@/lib/modules/auth/token-version-update'
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

type ChangePasswordData = z.infer<typeof ChangePasswordSchema>

async function parseChangePassword(req: Request): Promise<{ data: ChangePasswordData } | { response: NextResponse }> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return { response: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  }

  const parsed = ChangePasswordSchema.safeParse(body)
  if (!parsed.success) {
    return {
      response: NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      ),
    }
  }
  return { data: parsed.data }
}

async function updatePassword(userId: string, data: ChangePasswordData): Promise<NextResponse> {
  await connectDB()
  const user = await User.findById(userId).select('password_hash token_version').lean()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const currentPasswordValid = await bcrypt.compare(data.currentPassword, user.password_hash)
  if (!currentPasswordValid) return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 })

  const password_hash = await bcrypt.hash(data.newPassword, 10)
  const tokenVersionUpdate = buildTokenVersionUpdate(user.token_version)
  const update = await User.updateOne(
    { _id: user._id, ...tokenVersionUpdate.versionFilter },
    { $set: { password_hash, token_version: tokenVersionUpdate.nextVersion } }
  )
  if (update.matchedCount !== 1) {
    return NextResponse.json({ error: 'Account changed. Reload and try again.' }, { status: 409 })
  }
  clearUserStatusCache(userId)
  return NextResponse.json({ success: true })
}

export const PATCH = withAuth(async (req: Request, { payload }) => {
  try {
    const parsed = await parseChangePassword(req)
    if ('response' in parsed) return parsed.response
    return await updatePassword(payload.userId, parsed.data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })
