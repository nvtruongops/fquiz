import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { User } from '@/lib/models/User'
import mongoose from 'mongoose'

export const PUT = withAuth<{ id: string }>(async (req, { params, payload }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
  }

  await connectDB()
  const targetUser = await User.findById(id).lean()
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const isTargetAdmin = targetUser.role === 'admin'

  const body = await req.json().catch(() => ({}))
  const { role, status } = body

  // 1. Immutable Admin Protections: Cannot demote or lock root admin accounts
  if (isTargetAdmin) {
    if (role && role !== targetUser.role) {
      return NextResponse.json(
        { error: 'Cannot change or demote Administrator accounts' },
        { status: 403 }
      )
    }
    if (status === 'banned') {
      return NextResponse.json(
        { error: 'Cannot suspend Administrator accounts' },
        { status: 403 }
      )
    }
  }

  // 2. Privilege Escalation Prevention: Cannot elevate regular users to admin via UI (only dev/teacher/student allowed)
  if (!isTargetAdmin && role === 'admin') {
    return NextResponse.json(
      { error: 'Cannot elevate user accounts to Administrator via this interface' },
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
    return NextResponse.json({ error: 'No valid update data provided' }, { status: 400 })
  }

  const user = await User.findByIdAndUpdate(id, update, { new: true })
    .select('-password_hash -reset_token -reset_token_expires')
    .lean()

  return NextResponse.json({ success: true, user })
})

export const DELETE = withAuth<{ id: string }>(async (req, { params, payload }) => {
  const { id } = await Promise.resolve(params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
  }

  if (id === payload.userId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  await connectDB()
  const targetUser = await User.findById(id).lean()
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Protection: Admin accounts cannot be deleted via Admin Panel
  if (targetUser.role === 'admin') {
    return NextResponse.json(
      { error: 'Security: Cannot delete Administrator accounts' },
      { status: 403 }
    )
  }

  await User.findByIdAndDelete(id)
  return NextResponse.json({ success: true, message: 'User deleted successfully' })
})
