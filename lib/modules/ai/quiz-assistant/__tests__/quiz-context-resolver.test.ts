import { QuizContextResolver } from '../context/quiz-context-resolver'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'

jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({
  QuizSession: {
    findById: jest.fn(),
  },
}))

jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: {
    findById: jest.fn(),
  },
}))

jest.mock('@/lib/modules/quiz/models/Question', () => ({
  Question: {
    findById: jest.fn(),
  },
}))

jest.mock('@/lib/modules/quiz/models/Category', () => ({
  Category: {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'cat-1',
          name: 'PMG201C',
        }),
      }),
    }),
  },
}))

describe('QuizContextResolver Tests & Invariant 1 & 2 Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('INVARIANT 1 (Negative): should reject with 403 when session belongs to User A but token is User B', async () => {
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'session-123',
        student_id: 'user-a',
        quiz_id: 'quiz-1',
      }),
    })

    await expect(
      QuizContextResolver.resolve({
        sessionId: 'session-123',
        questionIndex: 0,
        userQuery: 'Test question',
        authenticatedUserId: 'user-b', // User B trying to access User A's session
      })
    ).rejects.toMatchObject({ message: 'Forbidden', status: 403 })
  })

  it('INVARIANT 1 (Security): should use authenticatedUserId even if request object has other userId', async () => {
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'session-123',
        student_id: 'user-a',
        quiz_id: 'quiz-1',
        questions_cache: [
          {
            _id: 'q-1',
            text: 'Question text',
            options: ['A. Opt 1', 'B. Opt 2'],
            correct_answer: 0,
          },
        ],
      }),
    })

    ;(Quiz.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'quiz-1',
          course_code: 'PMG201C_FA24',
          category_id: 'cat-1',
        }),
      }),
    })

    const context = await QuizContextResolver.resolve({
      sessionId: 'session-123',
      questionIndex: 0,
      userQuery: 'Test question',
      authenticatedUserId: 'user-a', // Authoritative JWT identity
    })

    expect(context.userId).toBe('user-a')
    expect(context.courseCode).toBe('PMG201C')
  })

  it('INVARIANT 2: should resolve question via session.question_order as Single Source of Truth', async () => {
    // UI questionIndex = 1, but question_order is [3, 0, 2, 1] -> actualIndex = 0
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'session-123',
        student_id: 'user-a',
        quiz_id: 'quiz-1',
        question_order: [3, 0, 2, 1], // Shuffled indices
        questions_cache: [
          { _id: 'q-actual-0', text: 'Actual Question 0', options: ['A. 1', 'B. 2'], correct_answer: 0 },
          { _id: 'q-actual-1', text: 'Actual Question 1', options: ['A. 3', 'B. 4'], correct_answer: 1 },
        ],
      }),
    })

    ;(Quiz.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'quiz-1',
          course_code: 'PMG201C',
          category_id: 'cat-1',
        }),
      }),
    })

    const context = await QuizContextResolver.resolve({
      sessionId: 'session-123',
      questionIndex: 1, // UI index 1 -> maps to question_order[1] = 0
      userQuery: 'Tại sao đáp án A đúng?',
      authenticatedUserId: 'user-a',
    })

    expect(context.currentQuestionIndex).toBe(1)
    expect(context.actualQuestionIndex).toBe(0)
    expect(context.question.text).toBe('Actual Question 0')
  })

  it('INVARIANT: Server DB correct_answer takes absolute precedence even if client sends correctAnswer=undefined', async () => {
    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'session-123',
        student_id: 'user-a',
        quiz_id: 'quiz-1',
        question_order: [0],
        questions_cache: [
          {
            _id: 'q-server',
            text: 'Matrix communication question',
            options: ['A. Simple', 'B. Open and accurate', 'C. Complex', 'D. Hard to automate'],
            correct_answer: 2, // 🛡️ Server DB says Option C (index 2)
          },
        ],
      }),
    })

    ;(Quiz.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'quiz-1',
          course_code: 'PMG201C',
          category_id: 'cat-1',
        }),
      }),
    })

    const context = await QuizContextResolver.resolve({
      sessionId: 'session-123',
      questionIndex: 0,
      questionText: 'Matrix communication question',
      options: ['A. Simple', 'B. Open and accurate', 'C. Complex', 'D. Hard to automate'],
      correctAnswer: undefined, // ⚠️ Client anti-cheat omits correctAnswer
      userQuery: 'Trong môn này có câu nào là đáp án B không ?',
      authenticatedUserId: 'user-a',
    })

    // Assert that server DB answer (index 2 = C. Complex) is preserved and NOT defaulted to 0
    expect(context.question.correctAnswer).toBe(2)
    expect(context.question.options[2]).toBe('C. Complex')
  })
})
