jest.mock('@fquiz/models', () => ({
  Classroom: { findById: jest.fn(), findOne: jest.fn() },
  ClassroomMember: { find: jest.fn(), findOne: jest.fn() },
  QuizAssignment: { find: jest.fn(), findById: jest.fn() },
  QuizAssignmentProgress: { find: jest.fn() },
  User: { find: jest.fn(), findById: jest.fn() },
  Quiz: { find: jest.fn() },
}))
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/modules/auth/auth', () => ({ verifyToken: jest.fn() }))

import { Types } from 'mongoose'
import { Classroom, ClassroomMember, QuizAssignment, QuizAssignmentProgress, User, Quiz } from '@fquiz/models'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken } from '@/lib/modules/auth/auth'
import { ClassroomService } from '../services/classroom-service'
import { GET as detailGET } from '@/app/api/teacher/classrooms/[id]/route'
import { GET as membersGET } from '@/app/api/teacher/classrooms/[id]/members/route'
import { GET as assignmentsGET } from '@/app/api/teacher/classrooms/[id]/assignments/route'
import { GET as reportGET } from '@/app/api/teacher/assignments/[id]/report/route'
import { GET as studentGET } from '@/app/api/student/classrooms/[id]/assignments/route'

const classroomId = '507f1f77bcf86cd799439011'
const teacherA = '507f1f77bcf86cd799439012'
const teacherB = '507f1f77bcf86cd799439013'
const studentId = '507f1f77bcf86cd799439014'
const assignmentId = '507f1f77bcf86cd799439015'
const quizId = '507f1f77bcf86cd799439016'
const classroom = { _id: new Types.ObjectId(classroomId), teacher_id: new Types.ObjectId(teacherA), name: 'Class A' }
const assignment = { _id: new Types.ObjectId(assignmentId), classroom_id: classroom._id, teacher_id: classroom.teacher_id, quiz_id: new Types.ObjectId(quizId), title: 'Homework', status: 'published' }
const student = { _id: new Types.ObjectId(studentId), username: 'Learner', email: 'learner@example.test', avatar_url: null }
const member = { classroom_id: classroom._id, student_id: student._id, status: 'active' }
const progress = { assignment_id: assignment._id, student_id: student._id, status: 'completed', best_score: 90, attempts_count: 1, is_passed: true }
const teacher = { _id: classroom.teacher_id, username: 'Owner', email: 'owner@example.test' }
const quiz = { _id: assignment.quiz_id, title: 'Quiz' }
const owner = { userId: teacherA, role: 'teacher' }
const learner = { userId: studentId, role: 'student' }
let membershipStatus: string | null
let classroomExists: boolean
let assignmentExists: boolean

function query(value: unknown) {
  return { lean: jest.fn().mockResolvedValue(value), sort: jest.fn().mockReturnThis() }
}

const methods = ['getClassroomDetail', 'getClassroomMembers', 'getClassroomAssignments', 'getAssignmentReport'] as const
type ReadMethod = typeof methods[number]
function read(method: ReadMethod, actor: unknown, id = method === 'getAssignmentReport' ? assignmentId : classroomId, progressStudentId?: string) {
  const args = [id, actor, progressStudentId]
  switch (method) {
    case 'getClassroomDetail': return Reflect.apply(ClassroomService.getClassroomDetail, ClassroomService, args) as Promise<unknown>
    case 'getClassroomMembers': return Reflect.apply(ClassroomService.getClassroomMembers, ClassroomService, args) as Promise<unknown>
    case 'getClassroomAssignments': return Reflect.apply(ClassroomService.getClassroomAssignments, ClassroomService, args) as Promise<unknown>
    case 'getAssignmentReport': return Reflect.apply(ClassroomService.getAssignmentReport, ClassroomService, args) as Promise<unknown>
  }
}

function expectNoProtectedReads() {
  expect(ClassroomMember.find).not.toHaveBeenCalled()
  expect(QuizAssignment.find).not.toHaveBeenCalled()
  expect(QuizAssignmentProgress.find).not.toHaveBeenCalled()
  expect(User.find).not.toHaveBeenCalled()
  expect(User.findById).not.toHaveBeenCalled()
  expect(Quiz.find).not.toHaveBeenCalled()
}

beforeEach(() => {
  jest.clearAllMocks()
  membershipStatus = 'active'
  classroomExists = true
  assignmentExists = true
  ;(Classroom.findById as jest.Mock).mockImplementation(() => query(classroomExists ? classroom : null))
  ;(Classroom.findOne as jest.Mock).mockImplementation((filter) => query(
    classroomExists && (!filter.teacher_id || String(filter.teacher_id) === teacherA) ? classroom : null,
  ))
  ;(ClassroomMember.findOne as jest.Mock).mockImplementation((filter) => query(
    membershipStatus && (!filter.status || filter.status === membershipStatus) ? { ...member, status: membershipStatus } : null,
  ))
  ;(ClassroomMember.find as jest.Mock).mockImplementation(() => query([member]))
  ;(QuizAssignment.findById as jest.Mock).mockImplementation(() => query(assignmentExists ? assignment : null))
  ;(QuizAssignment.find as jest.Mock).mockImplementation(() => query([assignment]))
  ;(QuizAssignmentProgress.find as jest.Mock).mockImplementation(() => query([progress]))
  ;(User.find as jest.Mock).mockImplementation(() => query([student]))
  ;(User.findById as jest.Mock).mockImplementation(() => query(teacher))
  ;(Quiz.find as jest.Mock).mockImplementation(() => query([quiz]))
  ;(verifyToken as jest.Mock).mockResolvedValue(owner)
})

describe('classroom service resource authorization', () => {
  it.each(methods)('%s denies teacher B access to teacher A resources before protected reads', async (method) => {
    await expect(read(method, { userId: teacherB, role: 'teacher' })).rejects.toMatchObject({ status: 404 })
    expectNoProtectedReads()
  })

  it.each(methods)('%s rejects missing actor context', async (method) => {
    await expect(read(method, undefined)).rejects.toMatchObject({ status: 404 })
    expectNoProtectedReads()
  })

  it.each(methods)('%s rejects malformed IDs before database queries', async (method) => {
    await expect(read(method, owner, 'not-an-object-id')).rejects.toMatchObject({ status: 400 })
    expect(Classroom.findById).not.toHaveBeenCalled()
    expect(Classroom.findOne).not.toHaveBeenCalled()
    expect(ClassroomMember.findOne).not.toHaveBeenCalled()
    expect(QuizAssignment.findById).not.toHaveBeenCalled()
    expectNoProtectedReads()
  })

  it.each(methods)('%s returns 404 for an absent classroom', async (method) => {
    classroomExists = false
    await expect(read(method, owner)).rejects.toMatchObject({ status: 404 })
    expectNoProtectedReads()
  })

  it('returns 404 for an absent assignment without reading roster or progress', async () => {
    assignmentExists = false
    await expect(read('getAssignmentReport', owner)).rejects.toMatchObject({ status: 404 })
    expectNoProtectedReads()
  })

  it.each(['blocked', null])('rejects student assignment reads with membership %s', async (status) => {
    membershipStatus = status
    await expect(read('getClassroomAssignments', learner, classroomId, studentId)).rejects.toMatchObject({ status: 404 })
    expectNoProtectedReads()
  })

  it.each(['getClassroomDetail', 'getClassroomMembers', 'getAssignmentReport'] as const)('%s does not grant student access via active membership', async (method) => {
    await expect(read(method, learner)).rejects.toMatchObject({ status: 404 })
    expectNoProtectedReads()
  })

  it('keeps progress selection separate from student authorization', async () => {
    await expect(read('getClassroomAssignments', learner, classroomId, teacherB)).rejects.toMatchObject({ status: 404 })
    expectNoProtectedReads()
  })

  it('validates the optional progress identity before any queries', async () => {
    await expect(read('getClassroomAssignments', owner, classroomId, 'bad-id')).rejects.toMatchObject({ status: 400 })
    expect(Classroom.findById).not.toHaveBeenCalled()
    expect(Classroom.findOne).not.toHaveBeenCalled()
    expectNoProtectedReads()
  })

  it('preserves owner detail, member, assignment and report data', async () => {
    expect(await read('getClassroomDetail', owner)).toEqual({ ...classroom, teacher })
    expect(await read('getClassroomMembers', owner)).toEqual([{ ...member, is_starred: false, tags: [], student }])
    expect(await read('getClassroomAssignments', owner)).toEqual([{ ...assignment, quiz, my_progress: null }])
    expect(await read('getAssignmentReport', owner)).toEqual({
      assignment, total_students: 1, completed_students: 1,
      students: [{ student_id: student._id, username: 'Learner', email: 'learner@example.test', avatar_url: null, status: 'completed', best_score: 90, attempts_count: 1, is_passed: true, submitted_at: null }],
    })
  })

  it('allows active students and selects only their progress', async () => {
    expect(await read('getClassroomAssignments', learner, classroomId, studentId)).toEqual([{ ...assignment, quiz, my_progress: progress }])
    expect(ClassroomMember.findOne).toHaveBeenCalledWith({ classroom_id: classroom._id, student_id: student._id, status: 'active' })
    expect(QuizAssignmentProgress.find).toHaveBeenCalledWith({ classroom_id: classroom._id, student_id: student._id })
  })

  it.each(['admin', 'dev'])('allows explicit authenticated %s access to all reads', async (role) => {
    for (const method of methods) {
      expect(await read(method, { userId: teacherB, role })).toBeTruthy()
    }
    expect(ClassroomMember.findOne).not.toHaveBeenCalled()
  })
})

const routes = [
  { name: 'teacher detail', get: detailGET, id: classroomId, key: 'classroom' },
  { name: 'teacher members', get: membersGET, id: classroomId, key: 'members' },
  { name: 'teacher assignments', get: assignmentsGET, id: classroomId, key: 'assignments' },
  { name: 'teacher assignment report', get: reportGET, id: assignmentId, key: 'report' },
  { name: 'student assignments', get: studentGET, id: classroomId, key: 'assignments' },
]
function request(get: typeof detailGET, id: string) {
  return get(new Request('https://web.example.test/api/test?role=admin&userId=' + teacherA), { params: Promise.resolve({ id }) })
}

describe.each(routes)('classroom GET $name', ({ name, get, id, key }) => {
  beforeEach(() => {
    ;(verifyToken as jest.Mock).mockResolvedValue(name === 'student assignments' ? learner : owner)
  })

  it('preserves the successful response envelope', async () => {
    const response = await request(get, id)
    expect(response.status).toBe(200)
    expect(Object.keys(await response.json())).toEqual([key])
  })

  it.each(['admin', 'dev'])('allows authenticated %s reads without ownership or membership', async (role) => {
    ;(verifyToken as jest.Mock).mockResolvedValue({ userId: teacherB, role })
    membershipStatus = null
    const response = await request(get, id)
    expect(response.status).toBe(200)
    expect(Object.keys(await response.json())).toEqual([key])
  })

  it('uses authenticated identity, not spoofed request role/identity', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(name === 'student assignments' ? learner : { userId: teacherB, role: 'teacher' })
    membershipStatus = null
    const response = await request(get, id)
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: name === 'teacher assignment report' ? 'Assignment not found' : 'Classroom not found' })
    expectNoProtectedReads()
  })

  it('returns 400 before connecting or querying for malformed IDs', async () => {
    const response = await request(get, 'invalid')
    expect(response.status).toBe(400)
    expect(connectDB).not.toHaveBeenCalled()
    expect(Classroom.findById).not.toHaveBeenCalled()
    expect(Classroom.findOne).not.toHaveBeenCalled()
    expect(QuizAssignment.findById).not.toHaveBeenCalled()
    expectNoProtectedReads()
  })

  it('logs unexpected errors server-side and returns a generic 500', async () => {
    const error = Object.assign(new Error('mongodb://private-secret-host internal failure'), { status: 400 })
    ;(connectDB as jest.Mock).mockRejectedValueOnce(error)
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const response = await request(get, id)
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Internal server error' })
      expect(log).toHaveBeenCalledWith(expect.any(String), error)
    } finally {
      log.mockRestore()
    }
  })

  it('does not accept missing authentication', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)
    const response = await request(get, id)
    expect(response.status).toBe(401)
    expect(connectDB).not.toHaveBeenCalled()
    expectNoProtectedReads()
  })
})

it('student classroom assignments GET rejects blocked membership', async () => {
  ;(verifyToken as jest.Mock).mockResolvedValue(learner)
  membershipStatus = 'blocked'
  const response = await request(studentGET, classroomId)
  expect(response.status).toBe(404)
  expect(await response.json()).toEqual({ error: 'Classroom not found' })
  expectNoProtectedReads()
})
