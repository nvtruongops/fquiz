import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { ClassroomService } from '@/lib/modules/classroom/services/classroom-service'

export const GET = withAuth(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    try {
      await connectDB()
      const { id } = await params
      const report = await ClassroomService.getAssignmentReport(id)
      if (!report) {
        return NextResponse.json({ error: 'Không tìm thấy bài tập' }, { status: 404 })
      }
      return NextResponse.json({ report })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi khi xuất báo cáo' }, { status: 500 })
    }
  },
  { roles: ['teacher', 'admin', 'dev'] }
)
