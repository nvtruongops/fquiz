import mongoose from 'mongoose'
import { Lesson } from '@/lib/modules/learning/models/Lesson'
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(null) }))

describe('Lesson Model', () => {
  it('should create valid lesson', () => {
    const l = new Lesson({
      title: 'Greetings', moduleId: new mongoose.Types.ObjectId(), order: 0,
      cefrLevel: 'A1', estimatedMinutes: 15, schemaVersion: 1, contentVersion: 1, metadata: {},
    })
    expect(l.validateSync()).toBeUndefined()
  })

  it('should have BaseEntity fields', () => {
    expect(Lesson.schema.path('status')).toBeDefined()
    expect(Lesson.schema.path('createdAt')).toBeDefined()
  })
})
