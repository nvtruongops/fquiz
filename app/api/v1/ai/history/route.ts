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

      const allLogs = await AILearningLog.find(queryFilter)
        .sort({ createdAt: -1 })
        .lean()

      // Deduplicate writing logs: If a 'writing' log has a matching 'writing_eval' log, omit the uncompleted 'writing' log
      const deduplicatedLogs: any[] = []
      const evalSourceTexts = new Set<string>()

      for (const log of allLogs) {
        if (log.type === 'writing_eval') {
          const st = (log.metadata?.params as any)?.sourceText || ''
          if (st) evalSourceTexts.add(st.trim().slice(0, 50))
          deduplicatedLogs.push(log)
        } else if (log.type === 'writing') {
          let st = (log.metadata?.params as any)?.sourceText || ''
          if (!st && log.response) {
            try {
              const resObj = JSON.parse(log.response)
              st = resObj.sourceText || ''
            } catch {}
          }
          const snippet = st ? st.trim().slice(0, 50) : ''
          if (snippet && evalSourceTexts.has(snippet)) {
            continue
          }
          const hasEvalMatch = allLogs.some(
            (other) =>
              other.type === 'writing_eval' &&
              Math.abs(new Date(other.createdAt).getTime() - new Date(log.createdAt).getTime()) < 60 * 60 * 1000 &&
              other.topic === log.topic
          )
          if (hasEvalMatch) {
            continue
          }
          deduplicatedLogs.push(log)
        } else {
          deduplicatedLogs.push(log)
        }
      }

      const total = deduplicatedLogs.length
      const paginatedLogs = deduplicatedLogs.slice(skip, skip + limit)

      return NextResponse.json({
        success: true,
        history: paginatedLogs.map((log) => ({
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
