import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { ClassroomService } from '@/lib/modules/classroom/services/classroom-service'
import { ClassroomReadError, validateClassroomResourceId } from '@/lib/modules/classroom/classroom-errors'

export const GET = withAuth<Promise<{ id: string }>>(
  async (req, { params, payload }) => {
    try {
      const { id } = await params
      validateClassroomResourceId(id)
      await connectDB()
      const report = await ClassroomService.getAssignmentReport(id, payload)
      return NextResponse.json({ report })
    } catch (err) {
      if (err instanceof ClassroomReadError) {
        return NextResponse.json({ error: err.status === 404 ? 'Assignment not found' : err.message }, { status: err.status })
      }
      console.error('Failed to generate classroom assignment report', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { roles: ['teacher', 'admin', 'dev'] }
)
