import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { AILearningLog } from '@/lib/modules/ai/models/AILearningLog'
import type { JWTPayload } from '@/lib/modules/auth/auth'
import { Types } from 'mongoose'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/v1/ai/history/[id]
 * Deletes a specific AI learning log owned by student
 */
export const DELETE = withAuth(
  async (req: Request, { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }) => {
    try {
      const { id } = await params
      if (!id || !Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: 'ID lịch sử không hợp lệ' }, { status: 400 })
      }

      await connectDB()

      const deleted = await AILearningLog.findOneAndDelete({
        _id: id,
        userId: payload.userId,
      })

      if (!deleted) {
        return NextResponse.json({ error: 'Không tìm thấy bản ghi lịch sử' }, { status: 404 })
      }

      return NextResponse.json({ success: true, message: 'Đã xóa bản ghi lịch sử thành công' })
    } catch (err: any) {
      console.error('[API /api/v1/ai/history/[id]] Error:', err)
      return NextResponse.json(
        { error: err.message || 'Lỗi khi xóa lịch sử học AI' },
        { status: 500 }
      )
    }
  },
  { roles: ['dev'] }
)
