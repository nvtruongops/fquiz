import fc from 'fast-check'
import {
  RegisterSchema,
  LoginSchema,
  QuestionSchema,
  CreateQuizSchema,
  SubmitAnswerSchema,
  CreateHighlightSchema,
  UpdateProfileSchema,
  UpdateStudentSettingsSchema,
} from '../schemas'

describe('RegisterSchema Validation', () => {
  describe('Valid inputs', () => {
    it('accepts valid registration data', () => {
      const validData = {
        username: 'testuser123',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      }
      const result = RegisterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('trims whitespace from username and email', () => {
      const data = {
        username: '  testuser  ',
        email: '  TEST@EXAMPLE.COM  ',
        password: 'Password123',
        confirmPassword: 'Password123',
      }
      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.username).toBe('testuser')
        expect(result.data.email).toBe('test@example.com')
      }
    })
  })

  describe('Invalid inputs', () => {
    it('rejects username shorter than 3 characters', () => {
      const data = {
        username: 'ab',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      }
      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects username longer than 30 characters', () => {
      const data = {
        username: 'a'.repeat(31),
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      }
      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects username with special characters', () => {
      const data = {
        username: 'test@user',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      }
      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test @example.com',
        'test@example',
      ]
      
      invalidEmails.forEach(email => {
        const result = RegisterSchema.safeParse({
          username: 'testuser',
          email,
          password: 'Password123',
          confirmPassword: 'Password123',
        })
        expect(result.success).toBe(false)
      })
    })

    it('rejects password without uppercase letter', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      }
      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects password without lowercase letter', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'PASSWORD123',
        confirmPassword: 'PASSWORD123',
      }
      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects password without number', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'PasswordABC',
        confirmPassword: 'PasswordABC',
      }
      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects password shorter than 8 characters', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Pass1',
        confirmPassword: 'Pass1',
      }
      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects mismatched passwords', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password456',
      }
      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Property-based tests', () => {
    it('accepts any valid username (3-30 alphanumeric + underscore)', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9_]{3,30}$/),
          (username) => {
            const result = RegisterSchema.safeParse({
              username,
              email: 'test@example.com',
              password: 'Password123',
              confirmPassword: 'Password123',
            })
            return result.success === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('rejects any password shorter than 8 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 7 }),
          (shortPassword) => {
            const result = RegisterSchema.safeParse({
              username: 'testuser',
              email: 'test@example.com',
              password: shortPassword,
              confirmPassword: shortPassword,
            })
            return result.success === false
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

describe('LoginSchema Validation', () => {
  it('accepts valid login data', () => {
    const validData = {
      identifier: 'testuser',
      password: 'password123',
    }
    const result = LoginSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('trims whitespace from identifier', () => {
    const data = {
      identifier: '  testuser  ',
      password: 'password123',
    }
    const result = LoginSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.identifier).toBe('testuser')
    }
  })

  it('rejects empty identifier', () => {
    const result = LoginSchema.safeParse({
      identifier: '',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = LoginSchema.safeParse({
      identifier: 'testuser',
      password: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('QuestionSchema Validation', () => {
  it('accepts valid question data', () => {
    const validData = {
      text: 'What is 2+2?',
      options: ['3', '4', '5', '6'],
      correct_answer: [1],
      explanation: 'Basic math',
    }
    const result = QuestionSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts multiple correct answers', () => {
    const validData = {
      text: 'Select all even numbers',
      options: ['1', '2', '3', '4'],
      correct_answer: [1, 3],
    }
    const result = QuestionSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects question with less than 2 options', () => {
    const data = {
      text: 'Question?',
      options: ['Only one'],
      correct_answer: [0],
    }
    const result = QuestionSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects question with more than 10 options', () => {
    const data = {
      text: 'Question?',
      options: Array(11).fill('option'),
      correct_answer: [0],
    }
    const result = QuestionSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects correct_answer index out of bounds', () => {
    const data = {
      text: 'Question?',
      options: ['A', 'B', 'C'],
      correct_answer: [5],
    }
    const result = QuestionSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects question text longer than 2000 characters', () => {
    const data = {
      text: 'a'.repeat(2001),
      options: ['A', 'B'],
      correct_answer: [0],
    }
    const result = QuestionSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('CreateQuizSchema Validation', () => {
  it('accepts valid quiz data', () => {
    const validData = {
      title: 'Math Quiz',
      category_id: '507f1f77bcf86cd799439011',
      course_code: 'MATH101',
      questions: [
        {
          text: 'What is 2+2?',
          options: ['3', '4', '5'],
          correct_answer: [1],
        },
      ],
      status: 'published' as const,
    }
    const result = CreateQuizSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects invalid MongoDB ObjectId for category_id', () => {
    const data = {
      title: 'Math Quiz',
      category_id: 'invalid-id',
      course_code: 'MATH101',
      questions: [
        {
          text: 'Question?',
          options: ['A', 'B'],
          correct_answer: [0],
        },
      ],
    }
    const result = CreateQuizSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects quiz with no questions', () => {
    const data = {
      title: 'Empty Quiz',
      category_id: '507f1f77bcf86cd799439011',
      course_code: 'MATH101',
      questions: [],
    }
    const result = CreateQuizSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects quiz with more than 100 questions', () => {
    const data = {
      title: 'Too Many Questions',
      category_id: '507f1f77bcf86cd799439011',
      course_code: 'MATH101',
      questions: Array(101).fill({
        text: 'Question?',
        options: ['A', 'B'],
        correct_answer: [0],
      }),
    }
    const result = CreateQuizSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('trims whitespace from title and course_code', () => {
    const data = {
      title: '  Math Quiz  ',
      category_id: '507f1f77bcf86cd799439011',
      course_code: '  MATH101  ',
      questions: [
        {
          text: 'Question?',
          options: ['A', 'B'],
          correct_answer: [0],
        },
      ],
    }
    const result = CreateQuizSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Math Quiz')
      expect(result.data.course_code).toBe('MATH101')
    }
  })
})

describe('SubmitAnswerSchema Validation', () => {
  it('accepts single answer_index', () => {
    const result = SubmitAnswerSchema.safeParse({
      answer_index: 2,
      question_index: 0,
    })
    expect(result.success).toBe(true)
  })

  it('accepts multiple answer_indexes', () => {
    const result = SubmitAnswerSchema.safeParse({
      answer_indexes: [0, 2, 3],
      question_index: 0,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative answer_index', () => {
    const result = SubmitAnswerSchema.safeParse({
      answer_index: -1,
      question_index: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects when neither answer_index nor answer_indexes provided', () => {
    const result = SubmitAnswerSchema.safeParse({
      question_index: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('CreateHighlightSchema Validation', () => {
  it('accepts valid highlight data', () => {
    const validData = {
      question_id: '507f1f77bcf86cd799439011',
      text_segment: 'important text',
      color_code: '#B0D4B8' as const,
      offset: 10,
    }
    const result = CreateHighlightSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects invalid question_id', () => {
    const data = {
      question_id: 'invalid-id',
      text_segment: 'text',
      color_code: '#B0D4B8' as const,
      offset: 0,
    }
    const result = CreateHighlightSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects invalid color_code', () => {
    const data = {
      question_id: '507f1f77bcf86cd799439011',
      text_segment: 'text',
      color_code: '#FF0000',
      offset: 0,
    }
    const result = CreateHighlightSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('accepts all valid color codes', () => {
    const validColors = ['#B0D4B8', '#D7F9FA', '#FFE082', '#EF9A9A']
    
    validColors.forEach(color => {
      const result = CreateHighlightSchema.safeParse({
        question_id: '507f1f77bcf86cd799439011',
        text_segment: 'text',
        color_code: color,
        offset: 0,
      })
      expect(result.success).toBe(true)
    })
  })

  it('rejects negative offset', () => {
    const data = {
      question_id: '507f1f77bcf86cd799439011',
      text_segment: 'text',
      color_code: '#B0D4B8' as const,
      offset: -1,
    }
    const result = CreateHighlightSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects offset larger than 10000', () => {
    const data = {
      question_id: '507f1f77bcf86cd799439011',
      text_segment: 'text',
      color_code: '#B0D4B8' as const,
      offset: 10001,
    }
    const result = CreateHighlightSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('UpdateProfileSchema Validation', () => {
  it('accepts valid profile data', () => {
    const validData = {
      profile_bio: 'This is my bio',
      avatar_url: 'https://example.com/avatar.jpg',
    }
    const result = UpdateProfileSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('trims whitespace from profile_bio', () => {
    const data = {
      profile_bio: '  My bio  ',
    }
    const result = UpdateProfileSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.profile_bio).toBe('My bio')
    }
  })

  it('rejects profile_bio longer than 300 characters', () => {
    const data = {
      profile_bio: 'a'.repeat(301),
    }
    const result = UpdateProfileSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects invalid avatar_url', () => {
    const invalidUrls = [
      'not-a-url',
      'ftp://example.com/image.jpg',
      'javascript:alert(1)',
    ]
    
    invalidUrls.forEach(url => {
      const result = UpdateProfileSchema.safeParse({
        avatar_url: url,
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('UpdateStudentSettingsSchema Validation', () => {
  it('accepts valid settings', () => {
    const validData = {
      timezone: 'Asia/Ho_Chi_Minh',
      language: 'vi' as const,
      notify_email: true,
      notify_quiz_reminder: false,
      privacy_share_activity: true,
    }
    const result = UpdateStudentSettingsSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts partial settings', () => {
    const data = {
      language: 'en' as const,
    }
    const result = UpdateStudentSettingsSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejects invalid language', () => {
    const data = {
      language: 'fr',
    }
    const result = UpdateStudentSettingsSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects timezone longer than 60 characters', () => {
    const data = {
      timezone: 'a'.repeat(61),
    }
    const result = UpdateStudentSettingsSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})
