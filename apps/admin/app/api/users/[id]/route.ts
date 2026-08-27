import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { User } from '@/lib/models/User'
import mongoose from 'mongoose'

export const PUT = withAuth<{ id: string }>(async (req, { params, payload }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID người dùng không hợp lệ' }, { status: 400 })
  }

  await connectDB()
  const targetUser = await User.findById(id).lean()
  if (!targetUser) {
    return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
  }

  const isTargetAdmin = targetUser.role === 'admin'

  const body = await req.json().catch(() => ({}))
  const { role, status } = body

  // 1. Immutable Admin Protections: Cannot demote or lock root admin accounts
  if (isTargetAdmin) {
    if (role && role !== targetUser.role) {
      return NextResponse.json(
        { error: 'Không thể thay đổi hoặc hạ quyền tài khoản Quản trị viên' },
        { status: 403 }
      )
    }
    if (status === 'banned') {
      return NextResponse.json(
        { error: 'Không thể khóa tài khoản Quản trị viên' },
        { status: 403 }
      )
    }
  }

  // 2. Privilege Escalation Prevention: Cannot elevate regular users to admin via UI (only dev/teacher/student allowed)
  if (!isTargetAdmin && role === 'admin') {
    return NextResponse.json(
      { error: 'Không thể nâng cấp tài khoản người dùng lên Quản trị viên qua giao diện này' },
      { status: 403 }
    )
  }

  const update: Record<string, any> = {}
  if (role && ['student', 'teacher', 'dev'].includes(role)) {
    update.role = role
  }
  if (status && ['active', 'banned'].includes(status)) {
    update.status = status
    // Bump token version to force logout on status change
    update.$inc = { token_version: 1 }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Không có dữ liệu cập nhật hợp lệ' }, { status: 400 })
  }

  const user = await User.findByIdAndUpdate(id, update, { new: true })
    .select('-password_hash -reset_token -reset_token_expires')
    .lean()

  return NextResponse.json({ success: true, user })
})

export const DELETE = withAuth<{ id: string }>(async (req, { params, payload }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID người dùng không hợp lệ' }, { status: 400 })
  }

  if (id === payload.userId) {
    return NextResponse.json({ error: 'Không thể tự xóa tài khoản của chính mình' }, { status: 400 })
  }

  await connectDB()
  const targetUser = await User.findById(id).lean()
  if (!targetUser) {
    return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
  }

  // Protection: Admin accounts cannot be deleted via Admin Panel
  if (targetUser.role === 'admin') {
    return NextResponse.json(
      { error: 'Bảo mật: Không thể xóa tài khoản Quản trị viên' },
      { status: 403 }
    )
  }

  await User.findByIdAndDelete(id)
  return NextResponse.json({ success: true, message: 'Đã xóa người dùng' })
})
