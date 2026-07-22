import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { ClassroomService } from '@/lib/modules/classroom/services/classroom-service'

export const GET = withAuth(
  async (req, { payload, params }: { params: Promise<{ id: string }>; payload: any }) => {
    try {
      await connectDB()
      const { id } = await params
      const assignments = await ClassroomService.getClassroomAssignments(id, payload.userId)
      return NextResponse.json({ assignments })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi lấy bài tập lớp học' }, { status: 500 })
    }
  },
  { roles: ['student', 'teacher', 'dev'] }
)
