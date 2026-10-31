import {
  checkQuestionInBank,
  checkQuestionsInBank,
  addOrUpdateQuestionInBank,
  syncQuizToQuestionBank,
} from '../question-bank-manager'
import { QuestionBank } from '../models/QuestionBank'
import { generateQuestionId } from '../question-id-generator'

// Mock dependencies
jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(null),
}))

jest.mock('../models/QuestionBank', () => {
  const mockDoc = {
    _id: 'doc-123',
    category_id: 'cat-123',
    question_id: 'q_hash',
    text: 'Test Question',
    options: ['A', 'B'],
    correct_answer: [0],
    used_in_quizzes: ['COURSE1'],
    used_in_quiz_ids: ['quiz-123'],
    usage_count: 1,
    save: jest.fn().mockResolvedValue(true),
  }
  return {
    QuestionBank: {
      findOne: jest.fn(),
      find: jest.fn(),
      updateOne: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findById: jest.fn(),
      mockDoc, // reference to mock doc for easy tests
    },
  }
})

describe('Question Bank Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkQuestionInBank', () => {
    it('should return hasConflict: false if question is not in bank', async () => {
      ;(QuestionBank.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      })

      const question = { text: 'Test Question', options: ['A', 'B'], correct_answer: 0 }
      const result = await checkQuestionInBank('cat-123', question)

      expect(result.hasConflict).toBe(false)
      expect(QuestionBank.findOne).toHaveBeenCalled()
    })

    it('should return conflictType: same_answer if question matches with same answer', async () => {
      const mockExisting = {
        _id: 'doc-123',
        text: 'Test Question',
        options: ['A', 'B'],
        correct_answer: [0],
        used_in_quizzes: ['COURSE1'],
        used_in_quiz_ids: ['quiz-123'],
        usage_count: 1,
      }
      ;(QuestionBank.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockExisting),
      })

      const question = { text: 'Test Question', options: ['A', 'B'], correct_answer: 0 }
      const result = await checkQuestionInBank('cat-123', question)

      expect(result.hasConflict).toBe(true)
      expect(result.conflictType).toBe('same_answer')
      expect(result.message).toContain('already exists in this course with the same answer')
    })

    it('should return conflictType: different_answer if answers differ', async () => {
      const mockExisting = {
        _id: 'doc-123',
        text: 'Test Question',
        options: ['A', 'B'],
        correct_answer: [0], // Existing correct answer is index 0 ("A")
        used_in_quizzes: ['COURSE1'],
        used_in_quiz_ids: ['quiz-123'],
        usage_count: 1,
      }
      ;(QuestionBank.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockExisting),
      })

      const question = { text: 'Test Question', options: ['A', 'B'], correct_answer: 1 } // Submitted answer is index 1 ("B")
      const result = await checkQuestionInBank('cat-123', question)

      expect(result.hasConflict).toBe(true)
      expect(result.conflictType).toBe('different_answer')
      expect(result.message).toContain('CONFLICT: A similar question already exists with a different answer!')
    })
  })

  describe('checkQuestionsInBank', () => {
    it('should query multiple questions at once and map conflicts', async () => {
      const questions = [
        { text: 'Q1', options: ['A', 'B'], correct_answer: 0 },
        { text: 'Q2', options: ['C', 'D'], correct_answer: 1 },
      ]

      const q1Id = generateQuestionId(questions[0])
      const mockExisting = [
        {
          _id: 'doc-q1',
          category_id: 'cat-123',
          question_id: q1Id, // dynamically generated hash for Q1
          text: 'Q1',
          options: ['A', 'B'],
          correct_answer: [1], // different answer -> conflict
          used_in_quizzes: ['COURSE1'],
          usage_count: 1,
        },
      ]

      ;(QuestionBank.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockExisting),
      })

      const result = await checkQuestionsInBank('cat-123', questions)
      expect(result.size).toBe(1)
      expect(result.get(0)?.conflictType).toBe('different_answer')
      expect(result.get(1)).toBeUndefined()
    })

    it('should NOT generate conflict if question text matches generic stem but options differ completely', async () => {
      const questions = [
        { text: 'According to the philosopher:', options: ['Revolutionary ethics is...', 'Option B'], correct_answer: 0 },
      ]

      const mockExisting = [
        {
          _id: 'doc-existing',
          category_id: 'cat-123',
          question_id: 'q_other_hash',
          text: 'According to the philosopher:',
          options: ['Culture is a synthesis of...', 'Option D'],
          correct_answer: [0],
          used_in_quizzes: ['COURSE1'],
          usage_count: 1,
        },
      ]

      ;(QuestionBank.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockExisting),
      })

      const result = await checkQuestionsInBank('cat-123', questions)
      expect(result.size).toBe(0) // No conflict! Treated as new question!
    })
  })

  describe('addOrUpdateQuestionInBank', () => {
    it('should update existing question with new course code and quizId', async () => {
      const mockExisting = {
        _id: 'doc-123',
        used_in_quizzes: ['COURSE1'],
        used_in_quiz_ids: ['quiz-123'],
      }
      ;(QuestionBank.findOne as jest.Mock).mockResolvedValue(mockExisting)
      ;(QuestionBank.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 })

      const mockUpdated = {
        _id: 'doc-123',
        used_in_quizzes: ['course1', 'COURSE1', 'COURSE2'],
        used_in_quiz_ids: ['quiz-123', 'quiz-456'],
        usage_count: 1,
        save: jest.fn().mockResolvedValue(true),
      }
      ;(QuestionBank.findById as jest.Mock).mockResolvedValue(mockUpdated)

      const question = { text: 'Test Question', options: ['A', 'B'], correct_answer: 0 }
      const result = await addOrUpdateQuestionInBank(
        'cat-123',
        question,
        'COURSE2',
        'user-123',
        'quiz-456'
      )

      expect(result.isNew).toBe(false)
      expect(QuestionBank.updateOne).toHaveBeenCalledWith(
        { _id: 'doc-123' },
        expect.objectContaining({
          $addToSet: {
            used_in_quizzes: 'COURSE2',
            used_in_quiz_ids: 'quiz-456',
          },
        })
      )
      expect(mockUpdated.usage_count).toBe(2)
      expect(mockUpdated.used_in_quizzes).toEqual(['COURSE1', 'COURSE2'])
      expect(mockUpdated.save).toHaveBeenCalled()
    })

    it('should create new question if not existing', async () => {
      ;(QuestionBank.findOne as jest.Mock).mockResolvedValue(null)
      ;(QuestionBank.create as jest.Mock).mockResolvedValue({ _id: 'new-doc-123' })

      const question = { text: 'Test Question', options: ['A', 'B'], correct_answer: 0 }
      const result = await addOrUpdateQuestionInBank(
        'cat-123',
        question,
        'COURSE1',
        'user-123',
        'quiz-123'
      )

      expect(result.isNew).toBe(true)
      expect(result._id).toBe('new-doc-123')
      expect(QuestionBank.create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Test Question',
          options: ['A', 'B'],
          correct_answer: [0],
          created_by: 'user-123',
          usage_count: 1,
        })
      )
    })
  })

  describe('syncQuizToQuestionBank', () => {
    it('should sync questions, skipping different answer conflicts', async () => {
      const questions = [
        { text: 'Q1', options: ['A', 'B'], correct_answer: 0 },
        { text: 'Q2', options: ['C', 'D'], correct_answer: 1 },
      ]

      // Mock Q1 is a conflict (different answer)
      ;(QuestionBank.findOne as jest.Mock)
        .mockImplementationOnce(() => ({
          lean: jest.fn().mockResolvedValue({
            _id: 'doc-q1',
            text: 'Q1',
            options: ['A', 'B'],
            correct_answer: [1], // conflicts with 0
            used_in_quizzes: ['COURSE1'],
          }),
        }))
        // Q2 does not exist (no conflict)
        .mockImplementationOnce(() => ({
          lean: jest.fn().mockResolvedValue(null),
        }))

      ;(QuestionBank.create as jest.Mock).mockResolvedValue({ _id: 'doc-q2' })

      const result = await syncQuizToQuestionBank(
        'cat-123',
        'COURSE1',
        questions,
        'user-123',
        'quiz-123'
      )

      expect(result.synced).toBe(1)
      expect(result.new).toBe(1)
      expect(result.existing).toBe(0)
      expect(result.conflicts.length).toBe(1)
      expect(result.conflicts[0].conflictType).toBe('different_answer')
      expect(QuestionBank.create).toHaveBeenCalledTimes(1) // only Q2 created
    })
  })

})

test('preflights every incoming bank question before the first write', async () => {
  jest.clearAllMocks()
  const valid = { text:'Choose 3 answers',options:['a','b','c','d'],correct_answer:[0,1,2] }
  ;(QuestionBank.findOne as jest.Mock).mockReturnValue(Object.assign(Promise.resolve(null), {lean: async () => null}))
  ;(QuestionBank.create as jest.Mock).mockResolvedValue({_id:'created'})
  await expect(syncQuizToQuestionBank('cat','CODE',[valid,{...valid,correct_answer:[0]}],'user')).rejects.toThrow()
  expect(QuestionBank.create).not.toHaveBeenCalled()
})
