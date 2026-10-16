import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { ClassroomService } from '@/lib/modules/classroom/services/classroom-service'

export const POST = withAuth(
  async (req, { params, payload }: { params: Promise<{ id: string }>; payload: any }) => {
    try {
      await connectDB()
      const { id } = await params
      await ClassroomService.leaveClassroom(payload.userId, id)
      return NextResponse.json({ message: 'Successfully left classroom' })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to leave classroom' }, { status: 400 })
    }
  },
  { roles: ['student', 'teacher', 'dev'] }
)
