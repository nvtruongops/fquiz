/**
 * Unit tests for Module model.
 */
import mongoose from 'mongoose'
import { Module } from '@/lib/modules/learning/models/Module'
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(null) }))

describe('Module Model', () => {
  it('should require courseId and order', () => {
    const m = new Module({ title: 'M1', order: 0, courseId: new mongoose.Types.ObjectId(), schemaVersion: 1, contentVersion: 1, metadata: {} })
    expect(m.validateSync()).toBeUndefined()
  })

  it('should require courseId', () => {
    const m = new Module({ title: 'M1', order: 0, schemaVersion: 1, contentVersion: 1, metadata: {} })
    expect(m.validateSync()).toBeDefined()
  })

  it('should have BaseEntity fields', () => {
    expect(Module.schema.path('status')).toBeDefined()
    expect(Module.schema.path('createdAt')).toBeDefined()
  })
})
