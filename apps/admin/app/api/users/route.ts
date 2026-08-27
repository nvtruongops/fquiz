import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { User } from '@/lib/models/User'
import { UserListQuerySchema } from '@/lib/schemas/common'

const SENSITIVE_FIELDS = '-password_hash -reset_token -reset_token_expires'

export const GET = withAuth(async (req) => {
  const url = new URL(req.url)
  const queryParams = Object.fromEntries(url.searchParams.entries())

  const parsed = UserListQuerySchema.safeParse(queryParams)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Tham số truy vấn không hợp lệ' }, { status: 400 })
  }

  const { page, limit, search, role, status } = parsed.data

  await connectDB()

  const filter: Record<string, any> = {}

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [
      { username: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ]
  }

  if (role) filter.role = role
  if (status) filter.status = status

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(SENSITIVE_FIELDS)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ])

  return NextResponse.json({
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
})
