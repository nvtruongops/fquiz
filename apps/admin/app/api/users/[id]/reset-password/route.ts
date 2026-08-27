import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'

export const POST = withAuth<{ id: string }>(async () => {
  return NextResponse.json(
    { error: 'Chức năng đổi mật khẩu trực tiếp qua Admin Panel đã bị vô hiệu hóa vì lý do bảo mật người dùng.' },
    { status: 403 }
  )
})
