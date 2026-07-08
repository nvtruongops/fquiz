import {
  SessionQuestionQuerySchema,
  QuizListQuerySchema,
  UserListQuerySchema,
  CategoryListQuerySchema,
  MongoIdSchema,
  validateObjectId,
  ImageUploadSchema,
} from '../common'

describe('SessionQuestionQuerySchema', () => {
  it('should parse valid question_index', () => {
    const result = SessionQuestionQuerySchema.parse({ question_index: 5 })
    expect(result.question_index).toBe(5)
  })

  it('should handle undefined/empty question_index', () => {
    expect(SessionQuestionQuerySchema.parse({}).question_index).toBeUndefined()
    expect(SessionQuestionQuerySchema.parse({ question_index: null }).question_index).toBeUndefined()
    expect(SessionQuestionQuerySchema.parse({ question_index: '' }).question_index).toBeUndefined()
  })
})

describe('QuizListQuerySchema', () => {
  it('should parse with category_id and search', () => {
    const result = QuizListQuerySchema.parse({
      category_id: '507f1f77bcf86cd799439011',
      search: 'quiz',
    })
    expect(result.category_id).toBe('507f1f77bcf86cd799439011')
    expect(result.search).toBe('quiz')
  })
})

describe('UserListQuerySchema', () => {
  it('should parse with role and status filters', () => {
    const result = UserListQuerySchema.parse({ role: 'admin', status: 'active' })
    expect(result.role).toBe('admin')
    expect(result.status).toBe('active')
  })

  it('should accept empty string as valid enum value', () => {
    const result = UserListQuerySchema.parse({ role: '', status: '' })
    expect(result.role).toBe('')
    expect(result.status).toBe('')
  })
})

describe('CategoryListQuerySchema', () => {
  it('should apply min_quizzes default', () => {
    const result = CategoryListQuerySchema.parse({})
    expect(result.min_quizzes).toBe(0)
  })

  it('should parse type and status', () => {
    const result = CategoryListQuerySchema.parse({ type: 'public', status: 'approved' })
    expect(result.type).toBe('public')
    expect(result.status).toBe('approved')
  })
})

describe('MongoIdSchema and validateObjectId', () => {
  it('should validate valid MongoDB ObjectIds', () => {
    expect(MongoIdSchema.safeParse('507f1f77bcf86cd799439011').success).toBe(true)
    expect(validateObjectId('507f1f77bcf86cd799439011')).toBe(true)
  })

  it('should reject invalid IDs', () => {
    expect(MongoIdSchema.safeParse('invalid').success).toBe(false)
    expect(MongoIdSchema.safeParse('').success).toBe(false)
    expect(MongoIdSchema.safeParse('507f1f77bcf86cd79943901z').success).toBe(false)
    expect(validateObjectId('invalid')).toBe(false)
  })
})

describe('ImageUploadSchema', () => {
  it('should accept valid image URLs', () => {
    const result = ImageUploadSchema.parse({ image_url: 'https://example.com/image.jpg' })
    expect(result.image_url).toBe('https://example.com/image.jpg')
  })

  it('should accept undefined image_url', () => {
    const result = ImageUploadSchema.parse({})
    expect(result.image_url).toBeUndefined()
  })

  it('should reject unsupported image formats', () => {
    const bmp = 'data:image/bmp;base64,' + Buffer.from('test').toString('base64')
    const result = ImageUploadSchema.safeParse({ image_url: bmp })
    expect(result.success).toBe(false)
  })
})
