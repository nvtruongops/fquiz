import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { ClassroomService } from '@/lib/modules/classroom/services/classroom-service'
import { createQuizAssignmentSchema } from '@/lib/modules/classroom/schemas/classroom'

export const GET = withAuth(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    try {
      await connectDB()
      const { id } = await params
      const assignments = await ClassroomService.getClassroomAssignments(id)
      return NextResponse.json({ assignments })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi khi lấy bài tập' }, { status: 500 })
    }
  },
  { roles: ['teacher', 'admin', 'dev'] }
)

export const POST = withAuth(
  async (req, { payload, params }: { params: Promise<{ id: string }>; payload: any }) => {
    try {
      await connectDB()
      const { id } = await params
      const body = await req.json()
      const parsed = createQuizAssignmentSchema.parse({
        ...body,
        classroom_id: id,
      })

      const assignment = await ClassroomService.assignQuizToClassroom(payload.userId, parsed)
      return NextResponse.json({ assignment, message: 'Giao bài tập thành công' }, { status: 201 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi khi giao bài tập' }, { status: 400 })
    }
  },
  { roles: ['teacher', 'admin', 'dev'] }
)
