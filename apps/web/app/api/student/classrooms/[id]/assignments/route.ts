import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { ClassroomService } from '@/lib/modules/classroom/services/classroom-service'
import { ClassroomReadError, validateClassroomResourceId } from '@/lib/modules/classroom/classroom-errors'

export const GET = withAuth<Promise<{ id: string }>>(
  async (req, { payload, params }) => {
    try {
      const { id } = await params
      validateClassroomResourceId(id)
      await connectDB()
      const assignments = await ClassroomService.getClassroomAssignments(id, payload, payload.userId)
      return NextResponse.json({ assignments })
    } catch (err) {
      if (err instanceof ClassroomReadError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      console.error('Failed to retrieve student classroom assignments', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { roles: ['student', 'teacher', 'dev'] }
)
