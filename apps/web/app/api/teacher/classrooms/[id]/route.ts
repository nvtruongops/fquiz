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
        return NextResponse.json({ error: 'Không tìm thấy lớp học' }, { status: 404 })
      }
      return NextResponse.json({ classroom })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi hệ thống' }, { status: 500 })
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
      return NextResponse.json({ classroom, message: 'Cập nhật lớp học thành công' })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi cập nhật lớp học' }, { status: 400 })
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
      return NextResponse.json({ message: 'Xóa lớp học thành công' })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi xóa lớp học' }, { status: 400 })
    }
  },
  { roles: ['teacher', 'admin', 'dev'] }
)
