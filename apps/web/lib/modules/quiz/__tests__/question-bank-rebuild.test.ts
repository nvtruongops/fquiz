jest.mock('@/lib/modules/quiz/models/Quiz', () => ({ Quiz: { find: jest.fn() } }))
jest.mock('@/lib/modules/quiz/models/QuestionBank', () => ({ QuestionBank: { bulkWrite: jest.fn(), updateMany: jest.fn() } }))
jest.mock('@fquiz/models', () => ({ ...jest.requireActual('@fquiz/models'), Question: { find: jest.fn() } }))
import { Question } from '@fquiz/models'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { rebuildQuestionBankUsage } from '../question-bank-manager'

test('rebuild materializes referenced decks and clears stale category associations by compound identity', async () => {
  ;(Quiz.find as jest.Mock).mockReturnValue({ select: () => ({ lean: async () => [{ _id: 'quiz', category_id: 'category', created_by: 'creator', course_code: 'REF', questions: [], question_refs: ['ref'] }] }) })
  ;(Question.find as jest.Mock).mockReturnValue({ select: () => ({ lean: async () => [{ _id: 'ref', question_id: 'canonical', text: 'Question?', options: ['A', 'B'], correct_answer: [1] }] }) })
  expect(await rebuildQuestionBankUsage()).toEqual({ processedQuizzes: 1, syncedQuestions: 1 })
  expect(QuestionBank.bulkWrite).toHaveBeenCalledWith([expect.objectContaining({ updateOne: expect.objectContaining({ filter: { category_id: 'category', question_id: 'canonical' } }) })], expect.anything())
  expect(QuestionBank.updateMany).toHaveBeenCalledWith({ $nor: [{ category_id: 'category', question_id: 'canonical' }] }, expect.anything())
})
