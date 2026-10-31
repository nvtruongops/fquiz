const deleteMany = jest.fn()
const sessions = [
  { student_id: '507f1f77bcf86cd799439011', status: 'completed', expires_at: undefined },
  { student_id: '507f1f77bcf86cd799439012', status: 'completed', expires_at: undefined },
]

jest.mock('@/lib/core/db/model-registry', () => ({ registerModel: jest.fn() }))
jest.mock('@/lib/core/services/user-cleanup-registry', () => ({ registerUserCleanupHandler: jest.fn() }))
jest.mock('../models/QuizComment', () => ({ QuizComment: { deleteMany } }))
jest.mock('../models/QuizSession', () => ({ QuizSession: { deleteMany } }))
jest.mock('../models/Quiz', () => ({ Quiz: { deleteMany } }))
jest.mock('../models/PinnedQuestion', () => ({ PinnedQuestion: { deleteMany } }))

import { registerUserCleanupHandler } from '@/lib/core/services/user-cleanup-registry'
import '../index'
const registeredQuizCleanup = (registerUserCleanupHandler as jest.Mock).mock.calls
  .find(([name]) => name === 'quiz')?.[1]

describe('quiz user cleanup', () => {
  beforeEach(() => jest.clearAllMocks())

  it('deletes sessions by the schema field student_id, including sessions without TTL expiry', async () => {
    deleteMany.mockImplementation(async (filter: any) => {
      if ('student_id' in filter) {
        const targetId = filter.student_id.toString()
        const removed = sessions.filter((session) => session.student_id === targetId)
        for (let index = sessions.length - 1; index >= 0; index--) {
          if (sessions[index].student_id === targetId) sessions.splice(index, 1)
        }
        return { deletedCount: removed.length }
      }
      return { deletedCount: 0 }
    })
    const handler = registeredQuizCleanup
    expect(handler).toBeDefined()

    await handler('507f1f77bcf86cd799439011')

    expect(deleteMany).toHaveBeenCalledWith({ student_id: '507f1f77bcf86cd799439011' })
    expect(sessions).toEqual([
      { student_id: '507f1f77bcf86cd799439012', status: 'completed', expires_at: undefined },
    ])
  })
})
