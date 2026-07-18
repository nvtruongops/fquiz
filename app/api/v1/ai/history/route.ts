import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { AILearningLog } from '@/lib/modules/ai/models/AILearningLog'
import type { JWTPayload } from '@/lib/modules/auth/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/ai/history
 * Fetch student's past AI learning sessions and evaluations
 */
export const GET = withAuth(
  async (req: Request, { payload }: { payload: JWTPayload }) => {
    try {
      await connectDB()

      const url = new URL(req.url)
      const type = url.searchParams.get('type')
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10))
      const search = url.searchParams.get('search')?.trim().toLowerCase() || ''

      const queryFilter: Record<string, unknown> = {
        userId: payload.userId,
      }

      if (type && type !== 'all') {
        if (type === 'writing_all') {
          queryFilter.type = { $in: ['writing', 'writing_eval'] }
        } else {
          queryFilter.type = type
        }
      }

      if (search) {
        queryFilter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { topic: { $regex: search, $options: 'i' } },
          { language: { $regex: search, $options: 'i' } },
        ]
      }

      const skip = (page - 1) * limit

      const [logs, total] = await Promise.all([
        AILearningLog.find(queryFilter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AILearningLog.countDocuments(queryFilter),
      ])

      return NextResponse.json({
        success: true,
        history: logs.map((log) => ({
          ...log,
          _id: log._id.toString(),
          userId: log.userId.toString(),
          createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: log.updatedAt ? new Date(log.updatedAt).toISOString() : new Date().toISOString(),
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      })
    } catch (err: any) {
      console.error('[API /api/v1/ai/history] Error:', err)
      return NextResponse.json(
        { error: err.message || 'Lỗi khi lấy lịch sử học AI' },
        { status: 500 }
      )
    }
  },
  { roles: ['dev'] }
)
