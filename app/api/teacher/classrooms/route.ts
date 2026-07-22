import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { ClassroomService } from '@/lib/modules/classroom/services/classroom-service'
import { createClassroomSchema } from '@/lib/modules/classroom/schemas/classroom'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'

export const GET = withAuth(
  async (req, { payload }) => {
    try {
      await connectDB()
      const classrooms = await ClassroomService.getClassroomsByTeacher(payload.userId)
      const totalQuizzes = await Quiz.countDocuments({ created_by: payload.userId, is_temp: { $ne: true } })
      return NextResponse.json({ classrooms, totalQuizzes })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi lấy danh sách lớp học' }, { status: 500 })
    }
  },
  { roles: ['teacher', 'admin', 'dev'] }
)

export const POST = withAuth(
  async (req, { payload }) => {
    try {
      await connectDB()
      const body = await req.json()
      const parsed = createClassroomSchema.parse(body)

      const classroom = await ClassroomService.createClassroom(payload.userId, parsed)
      return NextResponse.json({ classroom, message: 'Tạo lớp học thành công' }, { status: 201 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi khi tạo lớp học' }, { status: 400 })
    }
  },
  { roles: ['teacher', 'admin', 'dev'] }
)
