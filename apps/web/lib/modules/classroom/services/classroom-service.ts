import crypto from 'node:crypto'
import { Types } from 'mongoose'
import { Classroom, ClassroomMember, QuizAssignment, QuizAssignmentProgress, User, Quiz } from '@fquiz/models'
import type { JWTPayload } from '@fquiz/auth'
import { ClassroomReadError, validateClassroomResourceId } from '../classroom-errors'
import type { CreateClassroomInput, CreateQuizAssignmentInput } from '../schemas/classroom'
import { getPublicQuizFilter } from '@/lib/modules/quiz/utils/public-quiz-filter'

export type ClassroomActor = Pick<JWTPayload, 'userId' | 'role'>

async function requireClassroomAccess(classroomId: string, actor: ClassroomActor, allowStudent = false) {
  validateClassroomResourceId(classroomId)
  if (!actor || !Types.ObjectId.isValid(actor.userId)) {
    throw new ClassroomReadError(404, 'Classroom not found')
  }

  const classroom = await Classroom.findById(classroomId).lean()
  if (!classroom) throw new ClassroomReadError(404, 'Classroom not found')
  if (actor.role === 'admin' || actor.role === 'dev') return classroom
  if (actor.role === 'teacher' && classroom.teacher_id.toString() === actor.userId) return classroom

  if (allowStudent && actor.role === 'student') {
    const member = await ClassroomMember.findOne({
      classroom_id: classroom._id,
      student_id: new Types.ObjectId(actor.userId),
      status: 'active',
    }).lean()
    if (member) return classroom
  }
  throw new ClassroomReadError(404, 'Classroom not found')
}

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length))
  }
  return result
}

export class ClassroomService {
  /**
   * Create new classroom and generate 6-character join code
   */
  static async createClassroom(teacherId: string, input: CreateClassroomInput) {
    let code = generateJoinCode()
    let existing = await Classroom.findOne({ code })
    while (existing) {
      code = generateJoinCode()
      existing = await Classroom.findOne({ code })
    }

    return Classroom.create({
      name: input.name,
      password: input.password && input.password.trim() ? input.password.trim() : null,
      description: input.description ?? '',
      cover_image: input.cover_image ?? null,
      teacher_id: new Types.ObjectId(teacherId),
      code,
      status: 'active',
      student_count: 0,
    })
  }

  /**
   * Join classroom by Join Code & Password (if required)
   */
  static async joinClassroomByCode(studentId: string, code: string, password?: string) {
    const classroom = await Classroom.findOne({ code: code.trim().toUpperCase(), status: 'active' })
    if (!classroom) {
      throw new Error('Class code does not exist or classroom is closed')
    }

    if (classroom.settings?.allow_code_join === false) {
      throw new Error('This classroom has disabled joining via class code')
    }

    if (classroom.password) {
      const inputPass = (password || '').trim()
      if (!inputPass) {
        throw new Error('This classroom requires a password. Please enter the classroom password.')
      }
      if (inputPass !== classroom.password.trim()) {
        throw new Error('Incorrect classroom password.')
      }
    }

    const existingMember = await ClassroomMember.findOne({
      classroom_id: classroom._id,
      student_id: new Types.ObjectId(studentId),
    })

    if (existingMember) {
      if (existingMember.status === 'blocked') {
        throw new Error('You have been blocked from this classroom')
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
   * Get classrooms taught by teacher
   */
  static async getClassroomsByTeacher(teacherId: string) {
    return Classroom.find({ teacher_id: new Types.ObjectId(teacherId) }).sort({ created_at: -1 }).lean()
  }

  /**
   * Get student's enrolled classrooms
   */
  static async getClassroomsByStudent(studentId: string) {
    const memberships = await ClassroomMember.find({
      student_id: new Types.ObjectId(studentId),
      status: 'active',
    }).lean()

    const memberMap = new Map(memberships.map((m) => [m.classroom_id.toString(), m]))
    const classroomIds = memberships.map((m) => m.classroom_id)
    const classrooms = await Classroom.find({ _id: { $in: classroomIds }, status: 'active' })
      .select('-password')
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
   * Toggle pin classroom for student
   */
  static async togglePinClassroom(studentId: string, classroomId: string) {
    const member = await ClassroomMember.findOne({
      student_id: new Types.ObjectId(studentId),
      classroom_id: new Types.ObjectId(classroomId),
      status: 'active',
    })
    if (!member) throw new Error('You have not joined this classroom')

    member.is_pinned = !member.is_pinned
    await member.save()
    return { is_pinned: member.is_pinned }
  }

  /**
   * Student leaves classroom
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
   * Get classroom details
   */
  static async getClassroomDetail(classroomId: string, actor: ClassroomActor) {
    const classroom = await requireClassroomAccess(classroomId, actor)

    const teacher = await User.findById(classroom.teacher_id, 'username avatar_url email profile_bio').lean()
    return {
      ...classroom,
      teacher,
    }
  }

  /**
   * Get list of classroom members
   */
  static async getClassroomMembers(classroomId: string, actor: ClassroomActor) {
    await requireClassroomAccess(classroomId, actor)
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
   * Toggle star / favorite member status
   */
  static async toggleStarMember(teacherId: string, classroomId: string, studentId: string) {
    const classroom = await Classroom.findOne({ _id: classroomId, teacher_id: new Types.ObjectId(teacherId) })
    if (!classroom) throw new Error('You do not have permission to manage this classroom')

    const member = await ClassroomMember.findOne({ classroom_id: classroom._id, student_id: new Types.ObjectId(studentId) })
    if (!member) throw new Error('Student not found in classroom')

    member.is_starred = !member.is_starred
    await member.save()
    return { is_starred: member.is_starred }
  }

  /**
   * Update student note tags
   */
  static async updateMemberTags(teacherId: string, classroomId: string, studentId: string, tags: string[]) {
    const classroom = await Classroom.findOne({ _id: classroomId, teacher_id: new Types.ObjectId(teacherId) })
    if (!classroom) throw new Error('You do not have permission to manage this classroom')

    const member = await ClassroomMember.findOne({ classroom_id: classroom._id, student_id: new Types.ObjectId(studentId) })
    if (!member) throw new Error('Student not found in classroom')

    member.tags = tags.map((t) => t.trim()).filter(Boolean)
    await member.save()
    return { tags: member.tags }
  }

  /**
   * Remove member from classroom
   */
  static async removeMember(teacherId: string, classroomId: string, studentId: string) {
    const classroom = await Classroom.findOne({ _id: classroomId, teacher_id: new Types.ObjectId(teacherId) })
    if (!classroom) throw new Error('You do not have permission to manage this classroom')

    const member = await ClassroomMember.findOneAndDelete({ classroom_id: classroom._id, student_id: new Types.ObjectId(studentId) })
    if (member) {
      await Classroom.findByIdAndUpdate(classroom._id, { $inc: { student_count: -1 } })
    }
    return true
  }

  /**
   * Assign quiz to classroom
   */
  static async assignQuizToClassroom(teacherId: string, input: CreateQuizAssignmentInput) {
    const classroom = await Classroom.findById(input.classroom_id)
    if (!classroom) throw new Error('Classroom not found')

    if (classroom.teacher_id.toString() !== teacherId) {
      throw new Error('You are not the teacher of this classroom')
    }

    const quiz = await Quiz.findOne({
      _id: new Types.ObjectId(input.quiz_id),
      status: { $ne: 'deleted' },
      $or: [
        { created_by: new Types.ObjectId(teacherId) },
        getPublicQuizFilter(),
      ],
    })
    if (!quiz) throw new Error('Quiz not found')

    return QuizAssignment.create({
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
  }

  /**
   * Get list of assignments in classroom
   */
  static async getClassroomAssignments(classroomId: string, actor: ClassroomActor, studentId?: string) {
    validateClassroomResourceId(classroomId)
    if (studentId !== undefined) validateClassroomResourceId(studentId)
    if (actor?.role === 'student' && studentId !== undefined && studentId !== actor.userId) {
      throw new ClassroomReadError(404, 'Classroom not found')
    }
    await requireClassroomAccess(classroomId, actor, true)
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
   * Record student progress upon completing a quiz assignment
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
      return QuizAssignmentProgress.create({
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
    }
  }

  /**
   * Get assignment grade report for teacher
   */
  static async getAssignmentReport(assignmentId: string, actor: ClassroomActor) {
    validateClassroomResourceId(assignmentId)
    const assignment = await QuizAssignment.findById(assignmentId).lean()
    if (!assignment) throw new ClassroomReadError(404, 'Assignment not found')
    await requireClassroomAccess(assignment.classroom_id.toString(), actor)

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
        username: student?.username ?? 'Student',
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
   * Update classroom details (password, name, description)
   */
  static async updateClassroom(classroomId: string, teacherId: string, updates: { password?: string | null; name?: string; description?: string }) {
    const classroom = await Classroom.findOne({ _id: classroomId, teacher_id: new Types.ObjectId(teacherId) })
    if (!classroom) throw new Error('Classroom not found or unauthorized')

    if (updates.password !== undefined) {
      classroom.password = updates.password && updates.password.trim() ? updates.password.trim() : null
    }
    if (updates.name !== undefined) classroom.name = updates.name
    if (updates.description !== undefined) classroom.description = updates.description

    await classroom.save()
    return classroom
  }

  /**
   * Delete classroom and all associated data
   */
  static async deleteClassroom(classroomId: string, teacherId: string) {
    const classroom = await Classroom.findOneAndDelete({ _id: classroomId, teacher_id: new Types.ObjectId(teacherId) })
    if (!classroom) throw new Error('Classroom not found or unauthorized')

    await ClassroomMember.deleteMany({ classroom_id: classroom._id })
    await QuizAssignment.deleteMany({ classroom_id: classroom._id })
    await QuizAssignmentProgress.deleteMany({ classroom_id: classroom._id })

    return true
  }
}
