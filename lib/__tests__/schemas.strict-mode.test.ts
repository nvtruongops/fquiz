/**
 * Test suite for strict mode behavior and unknown field stripping
 * Verifies defense-in-depth strategy for mass assignment protection
 */

import {
  RegisterSchema,
  LoginSchema,
  CreateQuizSchema,
  UpdateUserSchema,
  PaginationQuerySchema,
  UserListQuerySchema,
  CreateCategoryRequestSchema,
  UpdateCategoryStatusSchema,
} from '../schemas'

describe('Strict Mode Behavior', () => {
  describe('User-facing schemas (non-strict) - should strip unknown fields', () => {
    it('RegisterSchema strips unknown fields but keeps valid ones', () => {
      const input = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        // Unknown fields that should be stripped
        role: 'admin',
        isAdmin: true,
        extraField: 'malicious',
      }

      const result = RegisterSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        })
        expect(result.data).not.toHaveProperty('role')
        expect(result.data).not.toHaveProperty('isAdmin')
        expect(result.data).not.toHaveProperty('extraField')
      }
    })

    it('LoginSchema strips unknown fields', () => {
      const input = {
        identifier: 'testuser',
        password: 'Password123',
        rememberMe: true, // Unknown field
        deviceId: 'abc123', // Unknown field
      }

      const result = LoginSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          identifier: 'testuser',
          password: 'Password123',
        })
        expect(result.data).not.toHaveProperty('rememberMe')
        expect(result.data).not.toHaveProperty('deviceId')
      }
    })

    it('CreateQuizSchema strips unknown fields', () => {
      const input = {
        title: 'Test Quiz',
        category_id: '507f1f77bcf86cd799439011',
        course_code: 'TEST-01',
        questions: [
          {
            text: 'Question 1',
            options: ['A', 'B'],
            correct_answer: [0],
          },
        ],
        status: 'published' as const,
        // Unknown fields
        isPublic: true,
        featured: true,
        priority: 10,
      }

      const result = CreateQuizSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveProperty('title')
        expect(result.data).toHaveProperty('category_id')
        expect(result.data).toHaveProperty('course_code')
        expect(result.data).toHaveProperty('questions')
        expect(result.data).toHaveProperty('status')
        expect(result.data).not.toHaveProperty('isPublic')
        expect(result.data).not.toHaveProperty('featured')
        expect(result.data).not.toHaveProperty('priority')
      }
    })
  })

  describe('Admin/Query schemas (strict) - should reject unknown fields', () => {
    it('UpdateUserSchema rejects unknown fields', () => {
      const input = {
        role: 'admin' as const,
        status: 'active' as const,
        // Unknown field
        permissions: ['read', 'write'],
      }

      const result = UpdateUserSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.code === 'unrecognized_keys'
        )).toBe(true)
      }
    })

    it('PaginationQuerySchema rejects unknown fields', () => {
      const input = {
        page: 1,
        limit: 20,
        // Unknown field
        sortBy: 'created_at',
      }

      const result = PaginationQuerySchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.code === 'unrecognized_keys'
        )).toBe(true)
      }
    })

    it('UserListQuerySchema rejects unknown fields', () => {
      const input = {
        page: 1,
        limit: 20,
        search: 'test',
        role: 'student' as const,
        status: 'active' as const,
        // Unknown field
        includeDeleted: true,
      }

      const result = UserListQuerySchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.code === 'unrecognized_keys'
        )).toBe(true)
      }
    })

    it('CreateCategoryRequestSchema rejects unknown fields', () => {
      const input = {
        name: 'Test Category',
        description: 'Test description',
        // Unknown field
        isPublic: true,
      }

      const result = CreateCategoryRequestSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.code === 'unrecognized_keys'
        )).toBe(true)
      }
    })

    it('UpdateCategoryStatusSchema rejects unknown fields', () => {
      const input = {
        status: 'approved' as const,
        // Unknown field
        reason: 'Looks good',
      }

      const result = UpdateCategoryStatusSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.code === 'unrecognized_keys'
        )).toBe(true)
      }
    })
  })

  describe('Defense-in-depth verification', () => {
    it('Non-strict schemas allow forward compatibility', () => {
      // Simulate frontend sending new fields that backend doesn't know yet
      const futureInput = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        // Future fields that don't exist yet
        twoFactorEnabled: true,
        preferredLanguage: 'vi',
        theme: 'dark',
      }

      const result = RegisterSchema.safeParse(futureInput)
      // Should succeed and strip unknown fields
      expect(result.success).toBe(true)
      if (result.success) {
        // Only known fields are kept
        expect(Object.keys(result.data)).toEqual([
          'username',
          'email',
          'password',
          'confirmPassword',
        ])
      }
    })

    it('Strict schemas prevent parameter pollution', () => {
      // Attacker tries to inject extra query params
      const maliciousInput = {
        page: 1,
        limit: 20,
        // Injection attempts
        $where: 'malicious code',
        __proto__: { isAdmin: true },
        constructor: { prototype: { isAdmin: true } },
      }

      const result = PaginationQuerySchema.safeParse(maliciousInput)
      // Should reject completely
      expect(result.success).toBe(false)
    })

    it('Coercion works with strict mode', () => {
      // Query params come as strings from URL
      const queryInput = {
        page: '5',
        limit: '50',
      }

      const result = PaginationQuerySchema.safeParse(queryInput)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(5)
        expect(result.data.limit).toBe(50)
        expect(typeof result.data.page).toBe('number')
        expect(typeof result.data.limit).toBe('number')
      }
    })
  })
})
