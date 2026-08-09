import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { User } from '@/lib/modules/auth/models/User'
import { connectDB } from '@/lib/core/db/mongodb'
import type { JWTPayload } from '@/lib/modules/auth/auth'

async function handleThemeUpdate(req: Request, payload: JWTPayload) {
  try {
    const body = await req.json()
    const theme = body.themePreference || body.theme

    if (!theme || !['light', 'dark', 'green'].includes(theme)) {
      return NextResponse.json({ error: 'Theme hợp lệ bao gồm: light, dark, green' }, { status: 400 })
    }

    await connectDB()
    const updatedUser = await User.findByIdAndUpdate(
      payload.userId,
      { $set: { themePreference: theme, theme_preference: theme } },
      { new: true }
    ).lean()

    if (!updatedUser) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
    }

    return NextResponse.json({ success: true, themePreference: theme, theme: theme })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export const PUT = withAuth(async (req, { payload }: { payload: JWTPayload }) => handleThemeUpdate(req, payload), { roles: ['student', 'teacher', 'admin', 'dev'] })
export const PATCH = withAuth(async (req, { payload }: { payload: JWTPayload }) => handleThemeUpdate(req, payload), { roles: ['student', 'teacher', 'admin', 'dev'] })
