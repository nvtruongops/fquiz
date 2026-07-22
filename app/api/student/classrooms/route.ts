import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { ClassroomService } from '@/lib/modules/classroom/services/classroom-service'

export const GET = withAuth(
  async (req, { payload }) => {
    try {
      await connectDB()
      const classrooms = await ClassroomService.getClassroomsByStudent(payload.userId)
      return NextResponse.json({ classrooms })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi lấy danh sách lớp học' }, { status: 500 })
    }
  },
  { roles: ['student', 'teacher', 'dev'] }
)
