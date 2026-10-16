import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { ClassroomService } from '@/lib/modules/classroom/services/classroom-service'

export const GET = withAuth(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    try {
      await connectDB()
      const { id } = await params
      const classroom = await ClassroomService.getClassroomDetail(id)
      if (!classroom) {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
      }
      return NextResponse.json({ classroom })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
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
      const classroom = await ClassroomService.updateClassroom(id, payload.userId, body)
      return NextResponse.json({ classroom, message: 'Classroom updated successfully' })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to update classroom' }, { status: 400 })
    }
  },
  { roles: ['teacher', 'admin', 'dev'] }
)

export const DELETE = withAuth(
  async (req, { params, payload }: { params: Promise<{ id: string }>; payload: any }) => {
    try {
      await connectDB()
      const { id } = await params
      await ClassroomService.deleteClassroom(id, payload.userId)
      return NextResponse.json({ message: 'Classroom deleted successfully' })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete classroom' }, { status: 400 })
    }
  },
  { roles: ['teacher', 'admin', 'dev'] }
)
