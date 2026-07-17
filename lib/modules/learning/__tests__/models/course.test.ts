/**
 * Unit tests for Course model.
 */
import mongoose from 'mongoose'
import { Course } from '@/lib/modules/learning/models/Course'
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(null) }))

describe('Course Model', () => {
  it('should require languageId', () => {
    const c = new Course({ title: 'Test', topicId: new mongoose.Types.ObjectId(), schemaVersion: 1, contentVersion: 1, metadata: {} })
    const err = c.validateSync()
    expect(err).toBeDefined()
    expect(err?.errors['languageId']).toBeDefined()
  })

  it('should have BaseEntity fields', () => {
    expect(Course.schema.path('status')).toBeDefined()
    expect(Course.schema.path('createdAt')).toBeDefined()
  })

  it('should have cefrLevel enum', () => {
    const c = new Course({
      title: 'Test', languageId: new mongoose.Types.ObjectId(), topicId: new mongoose.Types.ObjectId(),
      cefrLevel: 'B1', source: 'manual', schemaVersion: 1, contentVersion: 1, metadata: {},
    })
    expect(c.validateSync()).toBeUndefined()
  })

  it('should have publishedVersion and draftVersion defaults', () => {
    const c = new Course({
      title: 'Test', languageId: new mongoose.Types.ObjectId(), topicId: new mongoose.Types.ObjectId(),
      source: 'manual', schemaVersion: 1, contentVersion: 1, metadata: {},
    })
    expect(c.publishedVersion).toBe(1)
    expect(c.draftVersion).toBe(1)
  })
})
