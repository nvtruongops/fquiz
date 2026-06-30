import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken, clearUserStatusCache, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { User } from '@/lib/modules/auth/models/User'
import { UpdateUserSchema } from '@/lib/modules/auth/schemas/user'
import { validateObjectId } from '@/lib/core/schemas/common'

const SENSITIVE_FIELDS = '-password_hash -reset_token -reset_token_expires'

/** PUT — Update user role or status (ban/unban) */
export const PUT = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    await connectDB()
    
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = UpdateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}
    if (parsed.data.role) updates.role = parsed.data.role
    if (parsed.data.status) {
      updates.status = parsed.data.status
      if (parsed.data.status === 'banned') {
        updates.ban_reason = parsed.data.ban_reason ?? 'manual'
      } else {
        updates.ban_reason = null
        updates.sharing_violations = 0
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true })
      .select(SENSITIVE_FIELDS)
      .lean()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    
    // Clear cache immediately when status changes
    if (updates.status) {
      clearUserStatusCache(id)
    }
    
    return NextResponse.json({ user })
  } catch (err) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}, { roles: ['admin'] })

/** DELETE — Delete a single user. Admin cannot delete themselves. */
export const DELETE = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    if (id === payload.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 })
    }

    await connectDB()
    const user = await User.findByIdAndDelete(id)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ message: 'Deleted' })
  } catch (err) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}, { roles: ['admin'] })