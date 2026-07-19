import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { AILearningLog } from '@/lib/modules/ai/models/AILearningLog'
import { User } from '@/lib/modules/auth/models/User'

export const dynamic = 'force-dynamic'

export const TAB_DEFINITIONS = [
  {
    id: 'vocabulary',
    label: 'Tra Từ vựng AI',
    types: ['vocabulary'],
    color: 'emerald',
  },
  {
    id: 'grammar',
    label: 'Phân tích Ngữ pháp',
    types: ['grammar'],
    color: 'blue',
  },
  {
    id: 'reading',
    label: 'Đọc hiểu & Ngữ cảnh',
    types: ['paragraph', 'dialogue', 'story', 'sentence'],
    color: 'violet',
  },
  {
    id: 'translation',
    label: 'Dịch thuật ngữ cảnh',
    types: ['translation'],
    color: 'amber',
  },
  {
    id: 'writing',
    label: 'Luyện viết & Đánh giá AI',
    types: ['writing', 'writing_eval'],
    color: 'rose',
  },
]

export const GET = withAuth(
  async (req: Request) => {
    try {
      await connectDB()

      const { searchParams } = new URL(req.url)
      const range = searchParams.get('range') || '7d'
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
      const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)))
      const filterTab = searchParams.get('tab') || ''

      let dateFilter: Record<string, unknown> = {}
      const now = new Date()

      if (range === '24h') {
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
      } else if (range === '7d') {
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } }
      } else if (range === '30d') {
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } }
      }

      let typeQueryFilter: Record<string, unknown> = { ...dateFilter }
      if (filterTab) {
        const targetTab = TAB_DEFINITIONS.find((t) => t.id === filterTab)
        if (targetTab) {
          typeQueryFilter.type = { $in: targetTab.types }
        }
      }

      // 1. Overall Aggregate Metrics
      const [overallAgg] = await AILearningLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: 1 },
            totalInputTokens: { $sum: { $ifNull: ['$inputTokens', '$tokensUsed', 0] } },
            totalOutputTokens: { $sum: { $ifNull: ['$outputTokens', 0] } },
            totalTokens: {
              $sum: {
                $add: [
                  { $ifNull: ['$inputTokens', '$tokensUsed', 0] },
                  { $ifNull: ['$outputTokens', 0] },
                ],
              },
            },
            totalCost: { $sum: { $ifNull: ['$cost', 0] } },
          },
        },
      ])

      const summary = {
        totalCalls: overallAgg?.totalCalls || 0,
        totalInputTokens: overallAgg?.totalInputTokens || 0,
        totalOutputTokens: overallAgg?.totalOutputTokens || 0,
        totalTokens: overallAgg?.totalTokens || 0,
        avgTokensPerCall: overallAgg?.totalCalls ? Math.round(overallAgg.totalTokens / overallAgg.totalCalls) : 0,
        totalCost: Number((overallAgg?.totalCost || 0).toFixed(6)),
      }

      // 2. Tab Metrics Aggregation
      const tabAggregations = await Promise.all(
        TAB_DEFINITIONS.map(async (tabDef) => {
          const [agg] = await AILearningLog.aggregate([
            {
              $match: {
                ...dateFilter,
                type: { $in: tabDef.types },
              },
            },
            {
              $group: {
                _id: null,
                totalCalls: { $sum: 1 },
                totalInputTokens: { $sum: { $ifNull: ['$inputTokens', '$tokensUsed', 0] } },
                totalOutputTokens: { $sum: { $ifNull: ['$outputTokens', 0] } },
                totalTokens: {
                  $sum: {
                    $add: [
                      { $ifNull: ['$inputTokens', '$tokensUsed', 0] },
                      { $ifNull: ['$outputTokens', 0] },
                    ],
                  },
                },
                totalCost: { $sum: { $ifNull: ['$cost', 0] } },
              },
            },
          ])

          const calls = agg?.totalCalls || 0
          const inputTokens = agg?.totalInputTokens || 0
          const outputTokens = agg?.totalOutputTokens || 0
          const totalTokens = agg?.totalTokens || 0
          const cost = Number((agg?.totalCost || 0).toFixed(6))

          return {
            id: tabDef.id,
            label: tabDef.label,
            color: tabDef.color,
            types: tabDef.types,
            totalCalls: calls,
            totalInputTokens: inputTokens,
            totalOutputTokens: outputTokens,
            totalTokens: totalTokens,
            avgInputTokens: calls > 0 ? Math.round(inputTokens / calls) : 0,
            avgOutputTokens: calls > 0 ? Math.round(outputTokens / calls) : 0,
            avgTotalTokens: calls > 0 ? Math.round(totalTokens / calls) : 0,
            totalCost: cost,
          }
        })
      )

      // 3. Paginated Logs
      const skip = (page - 1) * limit
      const [logsRaw, totalLogs] = await Promise.all([
        AILearningLog.find(typeQueryFilter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AILearningLog.countDocuments(typeQueryFilter),
      ])

      // Populate user info for logs
      const userIds = Array.from(new Set(logsRaw.map((l) => String(l.userId)).filter(Boolean)))
      const usersMap = new Map<string, { name?: string; email?: string; username?: string }>()
      if (userIds.length > 0) {
        const users = await User.find({ _id: { $in: userIds } })
          .select('name email username')
          .lean()
        users.forEach((u) => {
          usersMap.set(String(u._id), {
            name: u.name || u.username,
            email: u.email,
            username: u.username,
          })
        })
      }

      const logs = logsRaw.map((log) => {
        const userInfo = usersMap.get(String(log.userId)) || {}
        const matchedTab = TAB_DEFINITIONS.find((t) => t.types.includes(log.type))
        const inputTok = log.inputTokens ?? log.tokensUsed ?? 0
        const outputTok = log.outputTokens ?? 0
        const totalTok = log.totalTokens ?? (inputTok + outputTok)

        return {
          id: String(log._id),
          userId: String(log.userId),
          userName: userInfo.name || 'Người dùng',
          userEmail: userInfo.email || 'N/A',
          type: log.type,
          tabId: matchedTab?.id || 'other',
          tabLabel: matchedTab?.label || log.type,
          language: log.language,
          topic: log.topic,
          aiProvider: log.aiProvider || 'gemini',
          aiModel: log.aiModel || (log.aiProvider === 'custom' ? 'Custom LLM' : log.aiProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash-001'),
          inputTokens: inputTok,
          outputTokens: outputTok,
          totalTokens: totalTok,
          cost: log.cost ?? 0,
          durationMs: log.durationMs ?? 0,
          createdAt: log.createdAt,
        }
      })

      return NextResponse.json({
        summary,
        tabStats: tabAggregations,
        logs,
        pagination: {
          page,
          limit,
          total: totalLogs,
          totalPages: Math.ceil(totalLogs / limit),
        },
      })
    } catch (err: any) {
      console.error('[API /api/admin/ai-usage] Error:', err)
      return NextResponse.json({ error: 'Không thể lấy dữ liệu thống kê AI token' }, { status: 500 })
    }
  },
  { roles: ['admin'] }
)
