import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { ClassroomService } from '@/lib/modules/classroom/services/classroom-service'

export const GET = withAuth(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    try {
      await connectDB()
      const { id } = await params
      const members = await ClassroomService.getClassroomMembers(id)
      return NextResponse.json({ members })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi khi lấy danh sách học viên' }, { status: 500 })
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
        return NextResponse.json({ error: 'Thiếu student_id' }, { status: 400 })
      }

      if (action === 'toggle_star') {
        const res = await ClassroomService.toggleStarMember(payload.userId, id, student_id)
        return NextResponse.json({ message: 'Cập nhật trạng thái đánh sao thành công', is_starred: res.is_starred })
      }

      if (action === 'update_tags') {
        const res = await ClassroomService.updateMemberTags(payload.userId, id, student_id, tags || [])
        return NextResponse.json({ message: 'Cập nhật thẻ ghi chú thành công', tags: res.tags })
      }

      return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi cập nhật học viên' }, { status: 400 })
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
        return NextResponse.json({ error: 'Thiếu student_id' }, { status: 400 })
      }

      await ClassroomService.removeMember(payload.userId, id, studentId)
      return NextResponse.json({ message: 'Xóa học viên khỏi lớp thành công' })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi xóa học viên' }, { status: 400 })
    }
  },
  { roles: ['teacher', 'admin', 'dev'] }
)
