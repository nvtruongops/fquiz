import { NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'
import { clearUserStatusCache } from '@/lib/modules/auth/auth'
import { purgeUserData } from '@/lib/modules/auth/account-deletion'

export const dynamic = 'force-dynamic'

const RestoreAccountSchema = z.object({
  token: z.string().min(1, 'Token khôi phục không hợp lệ'),
})

export async function POST(req: Request) {
  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
    }

    const parsed = RestoreAccountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Mã token khôi phục là bắt buộc' }, { status: 400 })
    }

    const { token } = parsed.data

    await connectDB()
    const user = await User.findOne({
      deletion_token: token,
      status: 'pending_deletion',
    })

    if (!user) {
      return NextResponse.json({ error: 'Mã khôi phục không tồn tại hoặc tài khoản đã được khôi phục' }, { status: 404 })
    }

    const now = new Date()
    if (user.deletion_token_expires && user.deletion_token_expires < now) {
      await purgeUserData(user._id.toString())
      return NextResponse.json({ error: 'Liên kết khôi phục đã hết hạn (quá thời hạn 72 giờ). Tài khoản và toàn bộ dữ liệu đã bị xóa hoàn toàn.' }, { status: 400 })
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
      message: 'Tài khoản của bạn đã được khôi phục thành công! Vui lòng đăng nhập lại.',
    })
  } catch (err) {
    console.error('POST /api/auth/restore-account error:', err)
    return NextResponse.json({ error: 'Lỗi máy chủ khi xử lý khôi phục tài khoản' }, { status: 500 })
  }
}
