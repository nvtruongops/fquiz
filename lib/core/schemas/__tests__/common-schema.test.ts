import {
  PaginationQuerySchema,
  SearchQuerySchema,
  PublicQuizzesQuerySchema,
  SessionQuestionQuerySchema,
  QuizListQuerySchema,
  UserListQuerySchema,
  CategoryListQuerySchema,
} from '../common'

describe('Pagination Query Schemas', () => {
  describe('PaginationQuerySchema', () => {
    it('should parse valid pagination params', () => {
      const result = PaginationQuerySchema.parse({ page: 1, limit: 20 })
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should apply default values', () => {
      const result = PaginationQuerySchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should reject page less than 1', () => {
      expect(() => PaginationQuerySchema.parse({ page: 0 })).toThrow()
    })

    it('should reject page greater than 1000', () => {
      expect(() => PaginationQuerySchema.parse({ page: 1001 })).toThrow()
    })

    it('should reject limit less than 1', () => {
      expect(() => PaginationQuerySchema.parse({ limit: 0 })).toThrow()
    })

    it('should reject limit greater than 100', () => {
      expect(() => PaginationQuerySchema.parse({ limit: 101 })).toThrow()
    })

    it('should reject unknown keys via strict()', () => {
      expect(() => PaginationQuerySchema.parse({ extra: 'fail' })).toThrow()
    })
  })

  describe('SearchQuerySchema', () => {
    it('should parse valid search params', () => {
      const result = SearchQuerySchema.parse({
        search: 'test',
        category_id: '507f1f77bcf86cd799439011',
        sort: 'newest',
      })
      expect(result.search).toBe('test')
      expect(result.sort).toBe('newest')
    })

    it('should convert null search to undefined', () => {
      const result = SearchQuerySchema.parse({ search: null })
      expect(result.search).toBeUndefined()
    })

    it('should reject invalid category_id format', () => {
      expect(() =>
        SearchQuerySchema.parse({ category_id: 'invalid' })
      ).toThrow('Invalid category ID')
    })

    it('should reject invalid sort values', () => {
      expect(() =>
        SearchQuerySchema.parse({ sort: 'invalid' })
      ).toThrow()
    })
  })

  describe('PublicQuizzesQuerySchema', () => {
    it('should extend PaginationQuerySchema with search, category_id, sort', () => {
      const result = PublicQuizzesQuerySchema.parse({
        page: 2, limit: 10, search: 'math',
        category_id: '507f1f77bcf86cd799439011',
        sort: 'popular',
      })
      expect(result.page).toBe(2)
      expect(result.limit).toBe(10)
      expect(result.search).toBe('math')
      expect(result.sort).toBe('popular')
    })
  })
})
