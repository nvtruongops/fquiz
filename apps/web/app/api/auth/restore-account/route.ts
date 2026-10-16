import { NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'
import { clearUserStatusCache } from '@/lib/modules/auth/auth'
import { purgeUserData } from '@/lib/modules/auth/account-deletion'

export const dynamic = 'force-dynamic'

const RestoreAccountSchema = z.object({
  token: z.string().min(1, 'Invalid restore token'),
})

export async function POST(req: Request) {
  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const parsed = RestoreAccountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Restore token is required' }, { status: 400 })
    }

    const { token } = parsed.data

    await connectDB()
    const user = await User.findOne({
      deletion_token: token,
      status: 'pending_deletion',
    })

    if (!user) {
      return NextResponse.json({ error: 'Restore token does not exist or account has already been restored' }, { status: 404 })
    }

    const now = new Date()
    if (user.deletion_token_expires && user.deletion_token_expires < now) {
      await purgeUserData(user._id.toString())
      return NextResponse.json({ error: 'The restore link has expired (past 72 hours). Your account and all data have been permanently deleted.' }, { status: 400 })
    }

    user.status = 'active'
    user.deletion_requested_at = null
    user.deletion_scheduled_for = null
    user.deletion_token = null
    user.deletion_token_expires = null
    user.token_version = (user.token_version || 1) + 1
    await user.save()

    clearUserStatusCache(user._id.toString())

    return NextResponse.json({
      success: true,
      message: 'Your account has been successfully restored! Please log in again.',
    })
  } catch (err) {
    console.error('POST /api/auth/restore-account error:', err)
    return NextResponse.json({ error: 'Internal server error while restoring account' }, { status: 500 })
  }
}
