import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { UpdateProfileSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

function resolveAvatarUrl(user: { avatar_url?: string | null; avatarUrl?: string | null } | null): string {
  if (!user) return ''
  return user.avatar_url ?? user.avatarUrl ?? ''
}

export async function GET(req: Request) {
  const payload = await verifyToken(req)
  if (payload?.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()
    const user = await User.findById(payload.userId).lean() as {
      username: string
      email: string
      avatar_url?: string | null
      avatarUrl?: string | null
      profile_bio?: string | null
      created_at: Date
    } | null

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

      const avatarUrl = resolveAvatarUrl(user)

    // Backfill canonical field if old data was stored under `avatarUrl`.
    if (!user.avatar_url && user.avatarUrl) {
      await User.findByIdAndUpdate(payload.userId, {
        $set: { avatar_url: user.avatarUrl },
      })
    }

    return NextResponse.json({
      profile: {
        username: user.username,
        email: user.email,
          avatarUrl,
        bio: user.profile_bio ?? '',
        createdAt: user.created_at,
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
    if (Object.hasOwn(body, 'username')) {
      return NextResponse.json({ error: 'Username không thể thay đổi sau khi đăng ký' }, { status: 400 })
    }

    const parsed = UpdateProfileSchema.safeParse(body)
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

    await connectDB()

    const toSet: Record<string, unknown> = {}
    if (updates.profile_bio !== undefined) toSet.profile_bio = updates.profile_bio.trim()
    if (updates.avatar_url !== undefined) toSet.avatar_url = updates.avatar_url.trim()

    const updated = await User.findByIdAndUpdate(
      payload.userId,
      { $set: toSet },
      { new: true, runValidators: true }
    ).lean() as {
      username: string
      email: string
      avatar_url?: string | null
      avatarUrl?: string | null
      profile_bio?: string | null
      created_at: Date
    } | null

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const freshUser = await User.findById(payload.userId)
      .select('username email avatar_url avatarUrl profile_bio created_at')
      .lean() as {
      username: string
      email: string
      avatar_url?: string | null
      avatarUrl?: string | null
      profile_bio?: string | null
      created_at: Date
    } | null

    if (!freshUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const avatarUrl = resolveAvatarUrl(freshUser)

    if (!freshUser.avatar_url && freshUser.avatarUrl) {
      await User.findByIdAndUpdate(payload.userId, {
        $set: { avatar_url: freshUser.avatarUrl },
      })
    }

    return NextResponse.json({
      profile: {
        username: freshUser.username,
        email: freshUser.email,
        avatarUrl,
        bio: freshUser.profile_bio ?? '',
        createdAt: freshUser.created_at,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
