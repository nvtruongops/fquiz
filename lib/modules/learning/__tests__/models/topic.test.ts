/**
 * Unit tests for Topic Mongoose Model.
 */
import { Topic } from '@/lib/modules/learning/models/Topic'

jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(null) }))

describe('Topic Model', () => {
  it('should have correct schema fields', () => {
    expect(Topic.schema.path('name')).toBeDefined()
    expect(Topic.schema.path('slug')).toBeDefined()
    expect(Topic.schema.path('parentTopicId')).toBeDefined()
    expect(Topic.schema.path('path')).toBeDefined()
  })

  it('should have slug as unique', () => {
    expect(Topic.schema.path('slug').options.unique).toBe(true)
  })

  it('should have BaseEntity fields', () => {
    expect(Topic.schema.path('status')).toBeDefined()
    expect(Topic.schema.path('createdAt')).toBeDefined()
  })

  it('should create a valid Topic', () => {
    const t = new Topic({ name: 'Travel', slug: 'travel', path: 'travel', status: 'published', schemaVersion: 1, contentVersion: 1, metadata: {} })
    expect(t.validateSync()).toBeUndefined()
  })
})
