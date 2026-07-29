import { notifyPinnedUsersNewQuiz } from '../utils/quiz-notification'
import { User } from '@/lib/modules/auth/models/User'
import { Category } from '@/lib/modules/quiz/models/Category'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { enqueueMail } from '@/lib/core/mail/mail'

jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/lib/modules/auth/models/User', () => ({
  User: {
    find: jest.fn(),
  },
}))

jest.mock('@/lib/modules/quiz/models/Category', () => ({
  Category: {
    findById: jest.fn(),
  },
}))

jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: {
    find: jest.fn(),
  },
}))

jest.mock('@/lib/core/mail/mail', () => ({
  enqueueMail: jest.fn().mockResolvedValue(true),
}))

describe('notifyPinnedUsersNewQuiz', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('enqueues mail for active users with notifications enabled who pinned the category/course code', async () => {
    (Category.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ name: 'Triết học Mác - Lênin' }),
      }),
    });

    (User.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { email: 'student1@example.com', username: 'Student 1' },
          { email: 'student2@example.com', username: 'Student 2' },
        ]),
      }),
    });

    (Quiz.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { _id: 'other1', title: 'Quiz cũ 1', questions: [1, 2, 3] },
            ]),
          }),
        }),
      }),
    })

    const quiz = {
      _id: 'quiz123',
      title: 'Đề thi MLN131 số 1',
      course_code: 'MLN131',
      category_id: 'cat123',
    }

    await notifyPinnedUsersNewQuiz(quiz)

    expect(User.find).toHaveBeenCalledWith({
      status: 'active',
      notify_email: true,
      pinned_categories: {
        $in: expect.arrayContaining(['cat123', 'MLN131', 'Triết học Mác - Lênin']),
      },
    })

    expect(enqueueMail).toHaveBeenCalledTimes(2)
    expect(enqueueMail).toHaveBeenCalledWith('new-quiz-notification', {
      to: 'student1@example.com',
      username: 'Student 1',
      courseCode: 'MLN131',
      quizTitle: 'Đề thi MLN131 số 1',
      quizId: 'quiz123',
      otherQuizzes: [{ id: 'other1', title: 'Quiz cũ 1', questionCount: 3 }],
    })
  })

  it('does nothing when no users match', async () => {
    (Category.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    (User.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    })

    const quiz = {
      _id: 'quiz456',
      title: 'Đề thi thử',
      course_code: 'MLN122',
      category_id: 'cat456',
    }

    await notifyPinnedUsersNewQuiz(quiz)

    expect(enqueueMail).not.toHaveBeenCalled()
  })
})
