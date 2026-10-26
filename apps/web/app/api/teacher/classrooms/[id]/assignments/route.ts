import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { ClassroomService } from '@/lib/modules/classroom/services/classroom-service'
import { ClassroomReadError, validateClassroomResourceId } from '@/lib/modules/classroom/classroom-errors'
import { createQuizAssignmentSchema } from '@/lib/modules/classroom/schemas/classroom'

export const GET = withAuth<Promise<{ id: string }>>(
  async (req, { params, payload }) => {
    try {
      const { id } = await params
      validateClassroomResourceId(id)
      await connectDB()
      const assignments = await ClassroomService.getClassroomAssignments(id, payload)
      return NextResponse.json({ assignments })
    } catch (err) {
      if (err instanceof ClassroomReadError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      console.error('Failed to retrieve classroom assignments', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
      return NextResponse.json({ assignment, message: 'Assignment assigned successfully' }, { status: 201 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to assign quiz' }, { status: 400 })
    }
  },
  { roles: ['teacher', 'admin', 'dev'] }
)
