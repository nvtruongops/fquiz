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
      const members = await ClassroomService.getClassroomMembers(id, payload)
      return NextResponse.json({ members })
    } catch (err) {
      if (err instanceof ClassroomReadError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      console.error('Failed to retrieve classroom members', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { roles: ['teacher', 'admin', 'dev'] }
)

export const PATCH = withAuth(
  async (req, { params, payload }: { params: Promise<{ id: string }>; payload: any }) => {
    try {
      await connectDB()
      const { id } = await params
      const body = await req.json()
      const { student_id, action, tags } = body

      if (!student_id) {
        return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
      }

      if (action === 'toggle_star') {
        const res = await ClassroomService.toggleStarMember(payload.userId, id, student_id)
        return NextResponse.json({ message: 'Starred status updated successfully', is_starred: res.is_starred })
      }

      if (action === 'update_tags') {
        const res = await ClassroomService.updateMemberTags(payload.userId, id, student_id, tags || [])
        return NextResponse.json({ message: 'Tags updated successfully', tags: res.tags })
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to update member' }, { status: 400 })
    }
  },
  { roles: ['teacher', 'admin', 'dev'] }
)

export const DELETE = withAuth(
  async (req, { params, payload }: { params: Promise<{ id: string }>; payload: any }) => {
    try {
      await connectDB()
      const { id } = await params
      const url = new URL(req.url)
      const studentId = url.searchParams.get('student_id')

      if (!studentId) {
        return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
      }

      await ClassroomService.removeMember(payload.userId, id, studentId)
      return NextResponse.json({ message: 'Student removed from classroom successfully' })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to remove member' }, { status: 400 })
    }
  },
  { roles: ['teacher', 'admin', 'dev'] }
)
