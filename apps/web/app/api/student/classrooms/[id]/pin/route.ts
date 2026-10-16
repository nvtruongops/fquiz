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
      return NextResponse.json({ message: 'Classroom pin status updated successfully', is_pinned: res.is_pinned })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to update classroom pin status' }, { status: 400 })
    }
  },
  { roles: ['student', 'teacher', 'dev'] }
)
