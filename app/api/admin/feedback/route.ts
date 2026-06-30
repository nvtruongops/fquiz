import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Feedback } from '@/lib/modules/auth/models/Feedback'

export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    await connectDB()

    const query: Record<string, unknown> = {}
    if (['pending', 'reviewed', 'resolved'].includes(status)) query.status = status
    if (['bug', 'feature', 'content', 'other'].includes(type)) query.type = type

    const [feedbacks, total] = await Promise.all([
      Feedback.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      Feedback.countDocuments(query),
    ])

    return NextResponse.json({ feedbacks, total, page, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('GET /api/admin/feedback error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['admin'] })