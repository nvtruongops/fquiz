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

    const updateDoc: any = {}
    if (parsed.data.role) {
      updateDoc.role = parsed.data.role
      updateDoc.$inc = { token_version: 1 } // Invalidate existing sessions
    }
    if (parsed.data.status) {
      updateDoc.status = parsed.data.status
      if (parsed.data.status === 'banned') {
        updateDoc.ban_reason = parsed.data.ban_reason ?? 'manual'
        if (!updateDoc.$inc) updateDoc.$inc = {}
        updateDoc.$inc.token_version = 1 // Also invalidate on ban
      } else {
        updateDoc.ban_reason = null
        updateDoc.sharing_violations = 0
      }
    }

    if (Object.keys(updateDoc).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const user = await User.findByIdAndUpdate(id, updateDoc, { new: true })
      .select(SENSITIVE_FIELDS)
      .lean()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    
    // Clear cache immediately when status changes
    if (updateDoc.status) {
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