import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { verifyToken, clearUserStatusCache } from '@/lib/modules/auth/auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'

export const dynamic = 'force-dynamic'

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự').max(50, 'Mật khẩu mới quá dài'),
  confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu nhập lại không khớp',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  path: ['newPassword'],
})

export async function PATCH(req: Request) {
  const payload = await verifyToken(req)
  if (payload?.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 401 })
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
}
