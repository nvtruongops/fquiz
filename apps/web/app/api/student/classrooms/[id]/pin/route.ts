import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { ClassroomService } from '@/lib/modules/classroom/services/classroom-service'

export const POST = withAuth(
  async (req, { params, payload }: { params: Promise<{ id: string }>; payload: any }) => {
    try {
      await connectDB()
      const { id } = await params
      const res = await ClassroomService.togglePinClassroom(payload.userId, id)
      return NextResponse.json({ message: 'Thao tác ghim lớp thành công', is_pinned: res.is_pinned })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi thao tác ghim lớp' }, { status: 400 })
    }
  },
  { roles: ['student', 'teacher', 'dev'] }
)
