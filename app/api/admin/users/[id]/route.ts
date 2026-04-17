import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken, requireRole } from '@/lib/auth'
import { User } from '@/models/User'
import { UpdateUserSchema, validateObjectId } from '@/lib/schemas'

const SENSITIVE_FIELDS = '-password_hash -reset_token -reset_token_expires'

/** PUT — Update user role or status (ban/unban) */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(payload, 'admin')

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
    return NextResponse.json({ user })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

/** DELETE — Delete a single user. Admin cannot delete themselves. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(payload, 'admin')

    if (id === payload.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 })
    }

    await connectDB()
    const user = await User.findByIdAndDelete(id)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ message: 'Deleted' })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
