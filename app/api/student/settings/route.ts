import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { UpdateStudentSettingsSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const payload = await verifyToken(req)
  if (payload?.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()
    const user = await User.findById(payload.userId)
      .select('timezone language notify_email notify_quiz_reminder privacy_share_activity')
      .lean() as {
      timezone?: string
      language?: 'vi' | 'en'
      notify_email?: boolean
      notify_quiz_reminder?: boolean
      privacy_share_activity?: boolean
    } | null

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      settings: {
        timezone: user.timezone ?? 'Asia/Ho_Chi_Minh',
        language: user.language ?? 'vi',
        notifyEmail: user.notify_email ?? true,
        notifyQuizReminder: user.notify_quiz_reminder ?? true,
        privacyShareActivity: user.privacy_share_activity ?? true,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const payload = await verifyToken(req)
  if (payload?.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = UpdateStudentSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const updates = parsed.data
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No data to update' }, { status: 400 })
    }

    const toSet: Record<string, unknown> = {}
    if (updates.timezone !== undefined) toSet.timezone = updates.timezone
    if (updates.language !== undefined) toSet.language = updates.language
    if (updates.notify_email !== undefined) toSet.notify_email = updates.notify_email
    if (updates.notify_quiz_reminder !== undefined) toSet.notify_quiz_reminder = updates.notify_quiz_reminder
    if (updates.privacy_share_activity !== undefined) toSet.privacy_share_activity = updates.privacy_share_activity

    await connectDB()
    const updated = await User.findByIdAndUpdate(
      payload.userId,
      { $set: toSet },
      { new: true, runValidators: true }
    )
      .select('timezone language notify_email notify_quiz_reminder privacy_share_activity')
      .lean() as {
      timezone?: string
      language?: 'vi' | 'en'
      notify_email?: boolean
      notify_quiz_reminder?: boolean
      privacy_share_activity?: boolean
    } | null

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      settings: {
        timezone: updated.timezone ?? 'Asia/Ho_Chi_Minh',
        language: updated.language ?? 'vi',
        notifyEmail: updated.notify_email ?? true,
        notifyQuizReminder: updated.notify_quiz_reminder ?? true,
        privacyShareActivity: updated.privacy_share_activity ?? true,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
