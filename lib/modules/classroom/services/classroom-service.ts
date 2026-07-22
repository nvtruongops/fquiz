import { Types } from 'mongoose'
import { Classroom } from '../models/Classroom'
import { ClassroomMember } from '../models/ClassroomMember'
import { QuizAssignment } from '../models/QuizAssignment'
import { QuizAssignmentProgress } from '../models/QuizAssignmentProgress'
import { User } from '@/lib/modules/auth/models/User'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import type { CreateClassroomInput, CreateQuizAssignmentInput } from '../schemas/classroom'

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export class ClassroomService {
  /**
   * Tạo lớp học mới và cấp mã code gia nhập 6 ký tự
   */
  static async createClassroom(teacherId: string, input: CreateClassroomInput) {
    let code = generateJoinCode()
    let existing = await Classroom.findOne({ code })
    while (existing) {
      code = generateJoinCode()
      existing = await Classroom.findOne({ code })
    }

    const classroom = await Classroom.create({
      name: input.name,
      password: input.password && input.password.trim() ? input.password.trim() : null,
      description: input.description ?? '',
      cover_image: input.cover_image ?? null,
      teacher_id: new Types.ObjectId(teacherId),
      code,
      status: 'active',
      student_count: 0,
    })

    return classroom
  }

  /**
   * Gia nhập lớp bằng Join Code & Password (nếu có)
   */
  static async joinClassroomByCode(studentId: string, code: string, password?: string) {
    const classroom = await Classroom.findOne({ code: code.trim().toUpperCase(), status: 'active' })
    if (!classroom) {
      throw new Error('Mã lớp học không tồn tại hoặc lớp đã đóng')
    }

    if (classroom.settings?.allow_code_join === false) {
      throw new Error('Lớp học này đã tắt tính năng tham gia bằng mã code')
    }

    if (classroom.password) {
      const inputPass = (password || '').trim()
      if (!inputPass) {
        throw new Error('Lớp học này yêu cầu Mật khẩu tham gia. Vui lòng nhập Mật khẩu lớp học.')
      }
      if (inputPass !== classroom.password.trim()) {
        throw new Error('Mật khẩu tham gia lớp học không chính xác.')
      }
    }

    const existingMember = await ClassroomMember.findOne({
      classroom_id: classroom._id,
      student_id: new Types.ObjectId(studentId),
    })

    if (existingMember) {
      if (existingMember.status === 'blocked') {
        throw new Error('Bạn đã bị chặn khỏi lớp học này')
      }
      return { classroom, member: existingMember, alreadyJoined: true }
    }

    const member = await ClassroomMember.create({
      classroom_id: classroom._id,
      student_id: new Types.ObjectId(studentId),
      status: 'active',
    })

    await Classroom.findByIdAndUpdate(classroom._id, { $inc: { student_count: 1 } })

    return { classroom, member, alreadyJoined: false }
  }

  /**
   * Lấy danh sách lớp do Giáo viên giảng dạy
   */
  static async getClassroomsByTeacher(teacherId: string) {
    return Classroom.find({ teacher_id: new Types.ObjectId(teacherId) }).sort({ created_at: -1 }).lean()
  }

  /**
   * Lấy danh sách lớp mà Học viên đã tham gia
  /**
   * Lấy danh sách lớp học của học viên
   */
  static async getClassroomsByStudent(studentId: string) {
    const memberships = await ClassroomMember.find({
      student_id: new Types.ObjectId(studentId),
      status: 'active',
    }).lean()

    const memberMap = new Map(memberships.map((m) => [m.classroom_id.toString(), m]))
    const classroomIds = memberships.map((m) => m.classroom_id)
    const classrooms = await Classroom.find({ _id: { $in: classroomIds }, status: 'active' })
      .sort({ created_at: -1 })
      .lean()

    // Match teacher info via application-level join (no populate)
    const teacherIds = [...new Set(classrooms.map((c) => c.teacher_id.toString()))]
    const teachers = await User.find({ _id: { $in: teacherIds } }, 'username avatar_url email profile_bio').lean()
    const teacherMap = new Map(teachers.map((t) => [t._id.toString(), t]))

    const list = classrooms.map((c) => {
      const mem = memberMap.get(c._id.toString())
      return {
        ...c,
        is_pinned: mem?.is_pinned ?? false,
        teacher: teacherMap.get(c.teacher_id.toString()) ?? null,
      }
    })

    return list.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
  }

  /**
   * Ghim/Bỏ ghim lớp học đối với học viên
   */
  static async togglePinClassroom(studentId: string, classroomId: string) {
    const member = await ClassroomMember.findOne({
      student_id: new Types.ObjectId(studentId),
      classroom_id: new Types.ObjectId(classroomId),
      status: 'active',
    })
    if (!member) throw new Error('Bạn chưa tham gia lớp học này')

    member.is_pinned = !member.is_pinned
    await member.save()
    return { is_pinned: member.is_pinned }
  }

  /**
   * Học viên rời khỏi lớp học
   */
  static async leaveClassroom(studentId: string, classroomId: string) {
    const member = await ClassroomMember.findOneAndDelete({
      student_id: new Types.ObjectId(studentId),
      classroom_id: new Types.ObjectId(classroomId),
    })
    if (member) {
      await Classroom.findByIdAndUpdate(classroomId, { $inc: { student_count: -1 } })
    }
    return true
  }

  /**
   * Lấy chi tiết lớp học
   */
  static async getClassroomDetail(classroomId: string) {
    const classroom = await Classroom.findById(classroomId).lean()
    if (!classroom) return null

    const teacher = await User.findById(classroom.teacher_id, 'username avatar_url email profile_bio').lean()
    return {
      ...classroom,
      teacher,
    }
  }

  /**
   * Lấy danh sách học viên trong lớp
   */
  static async getClassroomMembers(classroomId: string) {
    const members = await ClassroomMember.find({ classroom_id: new Types.ObjectId(classroomId), status: 'active' })
      .sort({ is_starred: -1, joined_at: -1 })
      .lean()

    const studentIds = members.map((m) => m.student_id)
    const students = await User.find({ _id: { $in: studentIds } }, 'username avatar_url email created_at').lean()
    const studentMap = new Map(students.map((s) => [s._id.toString(), s]))

    return members.map((m) => ({
      ...m,
      is_starred: m.is_starred ?? false,
      tags: m.tags ?? [],
      student: studentMap.get(m.student_id.toString()) ?? null,
    }))
  }

  /**
   * Đánh sao / bỏ đánh sao học viên nổi bật
   */
  static async toggleStarMember(teacherId: string, classroomId: string, studentId: string) {
    const classroom = await Classroom.findOne({ _id: classroomId, teacher_id: new Types.ObjectId(teacherId) })
    if (!classroom) throw new Error('Không có quyền quản lý lớp học này')

    const member = await ClassroomMember.findOne({ classroom_id: classroom._id, student_id: new Types.ObjectId(studentId) })
    if (!member) throw new Error('Không tìm thấy học viên trong lớp')

    member.is_starred = !member.is_starred
    await member.save()
    return { is_starred: member.is_starred }
  }

  /**
   * Cập nhật thẻ ghi chú cho học viên
   */
  static async updateMemberTags(teacherId: string, classroomId: string, studentId: string, tags: string[]) {
    const classroom = await Classroom.findOne({ _id: classroomId, teacher_id: new Types.ObjectId(teacherId) })
    if (!classroom) throw new Error('Không có quyền quản lý lớp học này')

    const member = await ClassroomMember.findOne({ classroom_id: classroom._id, student_id: new Types.ObjectId(studentId) })
    if (!member) throw new Error('Không tìm thấy học viên trong lớp')

    member.tags = tags.map((t) => t.trim()).filter(Boolean)
    await member.save()
    return { tags: member.tags }
  }

  /**
   * Xóa học viên khỏi lớp
   */
  static async removeMember(teacherId: string, classroomId: string, studentId: string) {
    const classroom = await Classroom.findOne({ _id: classroomId, teacher_id: new Types.ObjectId(teacherId) })
    if (!classroom) throw new Error('Không có quyền quản lý lớp học này')

    const member = await ClassroomMember.findOneAndDelete({ classroom_id: classroom._id, student_id: new Types.ObjectId(studentId) })
    if (member) {
      await Classroom.findByIdAndUpdate(classroom._id, { $inc: { student_count: -1 } })
    }
    return true
  }

  /**
   * Giao Quiz cho Lớp học
   */
  static async assignQuizToClassroom(teacherId: string, input: CreateQuizAssignmentInput) {
    const classroom = await Classroom.findById(input.classroom_id)
    if (!classroom) throw new Error('Không tìm thấy lớp học')

    if (classroom.teacher_id.toString() !== teacherId) {
      throw new Error('Bạn không phải là giáo viên của lớp học này')
    }

    const quiz = await Quiz.findById(input.quiz_id)
    if (!quiz) throw new Error('Không tìm thấy bộ đề Quiz')

    const assignment = await QuizAssignment.create({
      classroom_id: new Types.ObjectId(input.classroom_id),
      quiz_id: new Types.ObjectId(input.quiz_id),
      teacher_id: new Types.ObjectId(teacherId),
      title: input.title,
      description: input.description ?? '',
      start_at: input.start_at ? new Date(input.start_at) : null,
      due_at: input.due_at ? new Date(input.due_at) : null,
      time_limit_minutes: input.time_limit_minutes ?? 0,
      max_attempts: input.max_attempts ?? 0,
      pass_score_percent: input.pass_score_percent ?? 70,
      show_answers_immediately: input.show_answers_immediately ?? true,
      status: 'published',
    })

    return assignment
  }

  /**
   * Lấy danh sách Bài tập trong Lớp học
   */
  static async getClassroomAssignments(classroomId: string, studentId?: string) {
    const assignments = await QuizAssignment.find({
      classroom_id: new Types.ObjectId(classroomId),
      status: 'published',
    })
      .sort({ created_at: -1 })
      .lean()

    const quizIds = [...new Set(assignments.map((a) => a.quiz_id.toString()))]
    const quizzes = await Quiz.find({ _id: { $in: quizIds } }, 'title description questionCount category_id').lean()
    const quizMap = new Map(quizzes.map((q) => [q._id.toString(), q]))

    let progressMap = new Map<string, any>()
    if (studentId) {
      const progresses = await QuizAssignmentProgress.find({
        classroom_id: new Types.ObjectId(classroomId),
        student_id: new Types.ObjectId(studentId),
      }).lean()
      progressMap = new Map(progresses.map((p) => [p.assignment_id.toString(), p]))
    }

    return assignments.map((a) => ({
      ...a,
      quiz: quizMap.get(a.quiz_id.toString()) ?? null,
      my_progress: progressMap.get(a._id.toString()) ?? null,
    }))
  }

  /**
   * Cập nhật tiến độ của học viên khi hoàn thành 1 assignment Quiz
   */
  static async recordAssignmentResult(data: {
    assignmentId: string
    classroomId: string
    studentId: string
    sessionId: string
    scorePercent: number
  }) {
    const { assignmentId, classroomId, studentId, sessionId, scorePercent } = data

    const assignment = await QuizAssignment.findById(assignmentId)
    if (!assignment) return null

    const isPassed = scorePercent >= (assignment.pass_score_percent ?? 70)

    const existingProgress = await QuizAssignmentProgress.findOne({
      assignment_id: new Types.ObjectId(assignmentId),
      student_id: new Types.ObjectId(studentId),
    })

    if (existingProgress) {
      existingProgress.attempts_count += 1
      existingProgress.latest_session_id = new Types.ObjectId(sessionId)
      if (scorePercent > existingProgress.best_score) {
        existingProgress.best_score = scorePercent
      }
      if (isPassed) {
        existingProgress.is_passed = true
      }
      existingProgress.status = 'completed'
      existingProgress.submitted_at = new Date()
      await existingProgress.save()
      return existingProgress
    } else {
      const progress = await QuizAssignmentProgress.create({
        assignment_id: new Types.ObjectId(assignmentId),
        classroom_id: new Types.ObjectId(classroomId),
        student_id: new Types.ObjectId(studentId),
        latest_session_id: new Types.ObjectId(sessionId),
        best_score: scorePercent,
        attempts_count: 1,
        is_passed: isPassed,
        status: 'completed',
        submitted_at: new Date(),
      })
      return progress
    }
  }

  /**
   * Lấy báo cáo điểm số cho Giáo viên của 1 bài tập
   */
  static async getAssignmentReport(assignmentId: string) {
    const assignment = await QuizAssignment.findById(assignmentId).lean()
    if (!assignment) return null

    const members = await ClassroomMember.find({ classroom_id: assignment.classroom_id, status: 'active' }).lean()
    const studentIds = members.map((m) => m.student_id)

    const students = await User.find({ _id: { $in: studentIds } }, 'username email avatar_url').lean()
    const studentMap = new Map(students.map((s) => [s._id.toString(), s]))

    const progresses = await QuizAssignmentProgress.find({ assignment_id: assignment._id }).lean()
    const progressMap = new Map(progresses.map((p) => [p.student_id.toString(), p]))

    const studentReports = members.map((m) => {
      const student = studentMap.get(m.student_id.toString())
      const prog = progressMap.get(m.student_id.toString())
      return {
        student_id: m.student_id,
        username: student?.username ?? 'Học viên',
        email: student?.email ?? '',
        avatar_url: student?.avatar_url ?? null,
        status: prog?.status ?? 'not_started',
        best_score: prog?.best_score ?? 0,
        attempts_count: prog?.attempts_count ?? 0,
        is_passed: prog?.is_passed ?? false,
        submitted_at: prog?.submitted_at ?? null,
      }
    })

    return {
      assignment,
      total_students: members.length,
      completed_students: progresses.filter((p) => p.status === 'completed').length,
      students: studentReports,
    }
  }

  /**
   * Cập nhật thông tin lớp học (mật khẩu, tên, mô tả)
   */
  static async updateClassroom(classroomId: string, teacherId: string, updates: { password?: string | null; name?: string; description?: string }) {
    const classroom = await Classroom.findOne({ _id: classroomId, teacher_id: new Types.ObjectId(teacherId) })
    if (!classroom) throw new Error('Không tìm thấy lớp học hoặc không có quyền thực hiện')

    if (updates.password !== undefined) {
      classroom.password = updates.password && updates.password.trim() ? updates.password.trim() : null
    }
    if (updates.name !== undefined) classroom.name = updates.name
    if (updates.description !== undefined) classroom.description = updates.description

    await classroom.save()
    return classroom
  }

  /**
   * Xóa lớp học và tất cả dữ liệu liên quan
   */
  static async deleteClassroom(classroomId: string, teacherId: string) {
    const classroom = await Classroom.findOneAndDelete({ _id: classroomId, teacher_id: new Types.ObjectId(teacherId) })
    if (!classroom) throw new Error('Không tìm thấy lớp học hoặc không có quyền thực hiện')

    await ClassroomMember.deleteMany({ classroom_id: classroom._id })
    await QuizAssignment.deleteMany({ classroom_id: classroom._id })
    await QuizAssignmentProgress.deleteMany({ classroom_id: classroom._id })

    return true
  }
}
