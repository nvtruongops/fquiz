import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { PinnedQuestion } from '@/lib/modules/quiz/models/PinnedQuestion'
import { Types } from 'mongoose'
import { validateObjectId } from '@/lib/core/schemas/common'

/**
 * DELETE /api/student/pinned-questions/[id]
 * Deletes a single pinned question by ID.
 */
export const DELETE = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: any }
) => {
  try {
    const { id } = await params
    if (!validateObjectId(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ.' }, { status: 400 })
    }

    await connectDB()
    const result = await PinnedQuestion.deleteOne({
      _id: new Types.ObjectId(id),
      student_id: new Types.ObjectId(payload.userId),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Không tìm thấy câu hỏi ghim.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Đã xóa câu hỏi ghim.' })
  } catch (error) {
    console.error('Error deleting pinned question:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })
