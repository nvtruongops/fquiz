import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken, requireRole } from '@/lib/auth'
import { User } from '@/models/User'
import { BulkUserActionSchema } from '@/lib/schemas'

/** POST — Bulk actions: delete or ban/unban multiple users */
export async function POST(req: Request) {
  try {
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

    // Validate with schema
    const parsed = BulkUserActionSchema.safeParse(body)
    if (!parsed.success) {
      const hasMaxError = parsed.error.issues.some(i => i.message.includes('100') || i.code === 'too_big')
      return NextResponse.json(
        { error: hasMaxError ? 'Maximum 100 users allowed per bulk operation' : 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { user_ids, action } = parsed.data

    // Security: Remove admin's own ID from the list
    const safeIds = user_ids.filter((id) => id !== payload.userId)

    if (safeIds.length === 0) {
      return NextResponse.json({ error: 'No valid user IDs to process' }, { status: 400 })
    }

    let result: { modifiedCount?: number; deletedCount?: number } = {}

    if (action === 'delete') {
      result = await User.deleteMany({ _id: { $in: safeIds } })
    } else if (action === 'ban') {
      result = await User.updateMany(
        { _id: { $in: safeIds } },
        { status: 'banned', ban_reason: 'manual' }
      )
    } else if (action === 'unban') {
      result = await User.updateMany(
        { _id: { $in: safeIds } },
        { status: 'active', ban_reason: null, sharing_violations: 0 }
      )
    }

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      affected: result.modifiedCount ?? result.deletedCount ?? 0,
    })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
