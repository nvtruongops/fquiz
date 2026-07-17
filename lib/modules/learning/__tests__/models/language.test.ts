/**
 * Unit tests for Language Mongoose Model.
 */
import mongoose from 'mongoose'
import { Language } from '@/lib/modules/learning/models/Language'

// Mock mongoose connection
jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(null),
}))

describe('Language Model', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct schema fields', () => {
    const schema = Language.schema
    expect(schema.path('code')).toBeDefined()
    expect(schema.path('name')).toBeDefined()
    expect(schema.path('nativeName')).toBeDefined()
    expect(schema.path('direction')).toBeDefined()
    expect(schema.path('locale')).toBeDefined()
  })

  it('should default direction to ltr', () => {
    const schema = Language.schema
    expect(schema.path('direction').options.default).toBe('ltr')
  })

  it('should enforce code as lowercase and trim', () => {
    const schema = Language.schema
    const codePath = schema.path('code')
    expect(codePath.options.lowercase).toBe(true)
    expect(codePath.options.trim).toBe(true)
  })

  it('should have code as unique', () => {
    const schema = Language.schema
    expect(schema.path('code').options.unique).toBe(true)
  })

  it('should have BaseEntity fields', () => {
    const schema = Language.schema
    expect(schema.path('status')).toBeDefined()
    expect(schema.path('status').options.default).toBe('draft')
    expect(schema.path('createdAt')).toBeDefined()
    expect(schema.path('updatedAt')).toBeDefined()
    expect(schema.path('deletedAt')).toBeDefined()
    expect(schema.path('schemaVersion')).toBeDefined()
  })

  it('should create a valid Language document', () => {
    const data: Partial<InstanceType<typeof Language>> = {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      direction: 'ltr',
      status: 'published',
      schemaVersion: 1,
      contentVersion: 1,
      metadata: {},
    }
    const lang = new Language(data)
    const err = lang.validateSync()
    expect(err).toBeUndefined()
  })

  it('should reject empty code', () => {
    const lang = new Language({ name: 'X', nativeName: 'X' })
    const err = lang.validateSync()
    expect(err).toBeDefined()
  })

  it('should reject invalid direction', () => {
    const lang = new Language({ code: 'xx', name: 'X', nativeName: 'X', direction: 'invalid' })
    const err = lang.validateSync()
    expect(err).toBeDefined()
  })
})
