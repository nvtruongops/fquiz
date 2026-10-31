const mockRecords = {
  members: [
    { student_id: '507f1f77bcf86cd799439011', tags: ['private note'], is_pinned: true, is_starred: true },
    { student_id: '507f1f77bcf86cd799439012', tags: ['keep'], is_pinned: true, is_starred: true },
  ],
  progress: [
    { student_id: '507f1f77bcf86cd799439011', latest_session_id: 'session-a', best_score: 80 },
    { student_id: '507f1f77bcf86cd799439012', latest_session_id: 'session-b', best_score: 90 },
  ],
  classrooms: [
    { _id: 'class-a', teacher_id: '507f1f77bcf86cd799439011', name: 'Teacher Alice Biology', code: 'ABC123', status: 'active', password: 'secret', description: 'owner info', cover_image: 'owner.jpg', settings: { allow_code_join: true } },
    { _id: 'class-b', teacher_id: '507f1f77bcf86cd799439012', name: 'Keep class', code: 'DEF456', status: 'active', password: 'keep', description: 'keep', cover_image: 'keep.jpg', settings: { allow_code_join: true } },
  ],
  assignments: [
    { teacher_id: '507f1f77bcf86cd799439011', title: 'Teacher Alice exam', description: 'personal', status: 'published', pass_score_percent: 75 },
    { teacher_id: '507f1f77bcf86cd799439012', title: 'Quiz B', status: 'published' },
  ],
}

function mockUpdateMany(records: Array<Record<string, any>>, field: string) {
  return jest.fn().mockImplementation(async (filter: Record<string, any>, update: { $set: Record<string, any> }) => {
    const target = filter[field].toString()
    for (const record of records) {
      if (record[field] === target) Object.assign(record, update.$set)
    }
    return { acknowledged: true }
  })
}

const mockMemberUpdateMany = mockUpdateMany(mockRecords.members, 'student_id')
const mockProgressUpdateMany = mockUpdateMany(mockRecords.progress, 'student_id')
const mockAssignmentUpdateMany = mockUpdateMany(mockRecords.assignments, 'teacher_id')
const mockClassroomUpdateMany = jest.fn().mockImplementation(async (filter: any, pipeline: any[]) => {
  const update = pipeline[0].$set
  for (const record of mockRecords.classrooms) {
    if (record.teacher_id !== filter.teacher_id.toString()) continue
    record.teacher_id = update.teacher_id
    record.name = update.name
    record.code = `ANON-${update.code.$concat[1]}-${record._id}`
    record.status = update.status
    record.password = update.password
    record.description = update.description
    record.cover_image = update.cover_image
    record.settings.allow_code_join = update['settings.allow_code_join']
  }
  return { acknowledged: true }
})

jest.mock('@/lib/core/db/model-registry', () => ({ registerModel: jest.fn() }))
jest.mock('@/lib/core/services/user-cleanup-registry', () => ({ registerUserCleanupHandler: jest.fn() }))
jest.mock('../models/Classroom', () => ({ Classroom: { updateMany: mockClassroomUpdateMany } }))
jest.mock('../models/ClassroomMember', () => ({ ClassroomMember: { updateMany: mockMemberUpdateMany } }))
jest.mock('../models/QuizAssignment', () => ({ QuizAssignment: { updateMany: mockAssignmentUpdateMany } }))
jest.mock('../models/QuizAssignmentProgress', () => ({ QuizAssignmentProgress: { updateMany: mockProgressUpdateMany } }))

import { registerUserCleanupHandler } from '@/lib/core/services/user-cleanup-registry'
import '../index'
const registeredClassroomCleanup = (registerUserCleanupHandler as jest.Mock).mock.calls
  .find(([name]) => name === 'classroom')?.[1]

describe('classroom user cleanup', () => {
  const originalAnonymizationKey = process.env.ANONYMIZATION_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ANONYMIZATION_KEY = 'test-only-anonymization-key-with-32-plus-chars'
    mockRecords.members[0] = { student_id: '507f1f77bcf86cd799439011', tags: ['private note'], is_pinned: true, is_starred: true }
    mockRecords.members[1] = { student_id: '507f1f77bcf86cd799439012', tags: ['keep'], is_pinned: true, is_starred: true }
    mockRecords.progress[0] = { student_id: '507f1f77bcf86cd799439011', latest_session_id: 'session-a', best_score: 80 }
    mockRecords.progress[1] = { student_id: '507f1f77bcf86cd799439012', latest_session_id: 'session-b', best_score: 90 }
    mockRecords.classrooms[0] = { _id: 'class-a', teacher_id: '507f1f77bcf86cd799439011', name: 'Teacher Alice Biology', code: 'ABC123', status: 'active', password: 'secret', description: 'owner info', cover_image: 'owner.jpg', settings: { allow_code_join: true } }
    mockRecords.classrooms[1] = { _id: 'class-b', teacher_id: '507f1f77bcf86cd799439012', name: 'Keep class', code: 'DEF456', status: 'active', password: 'keep', description: 'keep', cover_image: 'keep.jpg', settings: { allow_code_join: true } }
    mockRecords.assignments[0] = { teacher_id: '507f1f77bcf86cd799439011', title: 'Teacher Alice exam', description: 'personal', status: 'published', pass_score_percent: 75 }
    mockRecords.assignments[1] = { teacher_id: '507f1f77bcf86cd799439012', title: 'Quiz B', status: 'published' }
  })

  afterAll(() => {
    if (originalAnonymizationKey === undefined) delete process.env.ANONYMIZATION_KEY
    else process.env.ANONYMIZATION_KEY = originalAnonymizationKey
  })

  it('retains rows, anonymizes deleted-owner fields, and leaves other users unchanged', async () => {
    const originalId = '507f1f77bcf86cd799439011'
    const handler = registeredClassroomCleanup
    expect(handler).toBeDefined()

    await handler(originalId)

    expect(mockRecords.members).toHaveLength(2)
    expect(mockRecords.progress).toHaveLength(2)
    const anonymizedId = mockRecords.members[0].student_id
    expect(anonymizedId).not.toBe(originalId)
    expect(mockRecords.members[0]).toMatchObject({ tags: [], is_pinned: false, is_starred: false })
    expect(mockRecords.progress[0]).toMatchObject({ student_id: anonymizedId, latest_session_id: null, best_score: 80 })
    expect(mockRecords.classrooms[0]).toMatchObject({
      teacher_id: anonymizedId,
      name: 'Archived classroom',
      status: 'archived',
      password: null,
      description: '',
      cover_image: null,
      settings: { allow_code_join: false },
    })
    expect(mockRecords.classrooms[0].code).toBe(`ANON-${anonymizedId}-class-a`)
    expect(mockRecords.assignments[0]).toMatchObject({
      teacher_id: anonymizedId,
      title: 'Archived assignment',
      description: '',
      status: 'closed',
      pass_score_percent: 75,
    })
    expect(mockRecords.members[1]).toEqual({ student_id: '507f1f77bcf86cd799439012', tags: ['keep'], is_pinned: true, is_starred: true })
    expect(mockRecords.progress[1]).toEqual({ student_id: '507f1f77bcf86cd799439012', latest_session_id: 'session-b', best_score: 90 })
    expect(mockRecords.classrooms[1]).toEqual({
      _id: 'class-b', teacher_id: '507f1f77bcf86cd799439012', name: 'Keep class', code: 'DEF456', status: 'active',
      password: 'keep', description: 'keep', cover_image: 'keep.jpg', settings: { allow_code_join: true },
    })
    expect(mockRecords.assignments[1]).toEqual({ teacher_id: '507f1f77bcf86cd799439012', title: 'Quiz B', status: 'published' })
    expect(mockClassroomUpdateMany).toHaveBeenCalledTimes(1)
    expect(mockClassroomUpdateMany.mock.calls[0][1][0].$set.code).toEqual({
      $concat: ['ANON-', anonymizedId.toString(), '-', { $toString: '$_id' }],
    })
  })

  it('fails before writes when ANONYMIZATION_KEY is missing or too short', async () => {
    process.env.ANONYMIZATION_KEY = 'too-short'
    await expect(registeredClassroomCleanup('507f1f77bcf86cd799439011')).rejects.toThrow('ANONYMIZATION_KEY must contain at least 32 characters')
    expect(mockMemberUpdateMany).not.toHaveBeenCalled()
    expect(mockProgressUpdateMany).not.toHaveBeenCalled()
    expect(mockClassroomUpdateMany).not.toHaveBeenCalled()
    expect(mockAssignmentUpdateMany).not.toHaveBeenCalled()
  })
})
