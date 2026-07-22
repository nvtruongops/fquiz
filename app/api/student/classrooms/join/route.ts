import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { ClassroomService } from '@/lib/modules/classroom/services/classroom-service'
import { joinClassroomSchema } from '@/lib/modules/classroom/schemas/classroom'

export const POST = withAuth(
  async (req, { payload }) => {
    try {
      await connectDB()
      const body = await req.json()
      const parsed = joinClassroomSchema.parse(body)

      const result = await ClassroomService.joinClassroomByCode(payload.userId, parsed.code, parsed.password)
      return NextResponse.json({
        classroom: result.classroom,
        alreadyJoined: result.alreadyJoined,
        message: result.alreadyJoined ? 'Bạn đã ở trong lớp học này' : 'Gia nhập lớp học thành công',
      })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi khi gia nhập lớp học' }, { status: 400 })
    }
  },
  { roles: ['student', 'teacher', 'dev'] }
)
