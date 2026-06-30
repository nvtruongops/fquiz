import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { User } from '@/lib/modules/auth/models/User'
import { UserListQuerySchema } from '@/lib/core/schemas/common'

export const dynamic = 'force-dynamic'

const SENSITIVE_FIELDS = '-password_hash -reset_token -reset_token_expires'

export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    
    // Validate query params
    const queryValidation = UserListQuerySchema.safeParse({
      ...(searchParams.get('page') !== null && { page: searchParams.get('page') }),
      ...(searchParams.get('limit') !== null && { limit: searchParams.get('limit') }),
      ...(searchParams.get('search') !== null && { search: searchParams.get('search') }),
      ...(searchParams.get('role') !== null && { role: searchParams.get('role') }),
      ...(searchParams.get('status') !== null && { status: searchParams.get('status') }),
    })

    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryValidation.error.issues },
        { status: 400 }
      )
    }

    const { page, limit, search, role: roleFilter, status: statusFilter } = queryValidation.data
    const skip = (page - 1) * limit

    // Build query
    const query: Record<string, unknown> = {}

    if (search && search.length >= 2) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [
        { username: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ]
    }

    if (roleFilter) {
      query.role = roleFilter
    }

    if (statusFilter) {
      query.status = statusFilter
    }

    const [users, total] = await Promise.all([
      User.find(query).select(SENSITIVE_FIELDS).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ])

    return NextResponse.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}, { roles: ['admin'] })