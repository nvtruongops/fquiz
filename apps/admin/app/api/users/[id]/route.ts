import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { User } from '@/lib/models/User'
import mongoose from 'mongoose'

function getInvalidUserIdResponse(id: string): NextResponse | null {
  return mongoose.Types.ObjectId.isValid(id)
    ? null
    : NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
}

async function getExistingUser(id: string): Promise<{ targetUser: any } | { response: NextResponse }> {
  await connectDB()
  const targetUser = await User.findById(id).lean()
  return targetUser
    ? { targetUser }
    : { response: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
}

function getAccountProtectionResponse(targetUser: any, role: any, status: any): NextResponse | null {
  return targetUser.role === 'admin'
    ? getAdminProtectionResponse(role, status)
    : getRoleElevationResponse(role)
}

function getAdminProtectionResponse(role: any, status: any): NextResponse | null {
  if (role && role !== 'admin') {
    return NextResponse.json({ error: 'Cannot change or demote Administrator accounts' }, { status: 403 })
  }
  if (status === 'banned') {
    return NextResponse.json({ error: 'Cannot suspend Administrator accounts' }, { status: 403 })
  }
  return null
}

function getRoleElevationResponse(role: any) {
  if (role === 'admin') {
    return NextResponse.json({ error: 'Cannot elevate user accounts to Administrator via this interface' }, { status: 403 })
  }
  return null
}

function getAllowedRole(role: any) {
  return role && ['student', 'teacher', 'dev'].includes(role) ? role : undefined
}

function getAllowedStatus(status: any) {
  return status && ['active', 'banned'].includes(status) ? status : undefined
}

function buildAllowedUserUpdate(role: any, status: any) {
  return {
    ...(getAllowedRole(role) ? { role } : {}),
    ...(getAllowedStatus(status) ? { status } : {}),
  }
}

function expectedField(value: unknown) {
  return value === undefined ? { $exists: false } : value
}

function buildUserUpdateFilter(id: string, targetUser: any) {
  return {
    _id: id,
    role: expectedField(targetUser.role),
    status: expectedField(targetUser.status),
    token_version: expectedField(targetUser.token_version),
  }
}

function hasValidTokenVersion(tokenVersion: any) {
  return typeof tokenVersion === 'number' && Number.isInteger(tokenVersion) && tokenVersion >= 1
}

function buildUserUpdateDocument(update: Record<string, any>, changed: boolean, tokenVersion: any) {
  if (!changed) return { $set: update }
  return hasValidTokenVersion(tokenVersion)
    ? { $set: update, $inc: { token_version: 1 } }
    : { $set: { ...update, token_version: 2 } }
}

function hasAccountStateChanged(update: Record<string, any>, targetUser: any) {
  return (update.role !== undefined && update.role !== targetUser.role) ||
    (update.status !== undefined && update.status !== targetUser.status)
}

async function updateExistingUser(id: string, targetUser: any, role: any, status: any): Promise<NextResponse> {
  const protectionResponse = getAccountProtectionResponse(targetUser, role, status)
  if (protectionResponse) return protectionResponse

  const update = buildAllowedUserUpdate(role, status)
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid update data provided' }, { status: 400 })
  }

  const user = await User.findOneAndUpdate(
    buildUserUpdateFilter(id, targetUser),
    buildUserUpdateDocument(update, hasAccountStateChanged(update, targetUser), targetUser.token_version),
    { new: true }
  ).select('-password_hash -reset_token -reset_token_expires').lean()

  if (!user) return NextResponse.json({ error: 'User changed concurrently; refresh and retry' }, { status: 409 })
  return NextResponse.json({ success: true, user })
}

export const PUT = withAuth<{ id: string }>(async (req, { params, payload }) => {
  const { id } = await Promise.resolve(params)
  const invalidIdResponse = getInvalidUserIdResponse(id)
  if (invalidIdResponse) return invalidIdResponse
  const targetResult = await getExistingUser(id)
  if ('response' in targetResult) return targetResult.response

  const body = await req.json().catch(() => ({}))
  const { role, status } = body
  return updateExistingUser(id, targetResult.targetUser, role, status)
})

export const DELETE = withAuth<{ id: string }>(async (req, { params, payload }) => {
  const { id } = await Promise.resolve(params)
  const invalidIdResponse = getInvalidUserIdResponse(id)
  if (invalidIdResponse) return invalidIdResponse

  if (id === payload.userId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const targetResult = await getExistingUser(id)
  if ('response' in targetResult) return targetResult.response
  const { targetUser } = targetResult

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
