import { LearningProgress } from '@/lib/modules/learning/models/LearningProgress'
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(null) }))

describe('LearningProgress Model', () => {
  it('should have correct schema fields', () => {
    expect(LearningProgress.schema.path('userId')).toBeDefined()
    expect(LearningProgress.schema.path('learningObjectId')).toBeDefined()
    expect(LearningProgress.schema.path('loType')).toBeDefined()
    expect(LearningProgress.schema.path('learningStrategy')).toBeDefined()
    expect(LearningProgress.schema.path('strategyState')).toBeDefined()
    expect(LearningProgress.schema.path('learningObjectVersion')).toBeDefined()
  })

  it('should default learningStrategy to sm2', () => {
    expect(LearningProgress.schema.path('learningStrategy').options.default).toBe('sm2')
  })

  it('should have compound unique index', () => {
    const hasIndex = LearningProgress.schema.indexes().some((i: any) => {
      const keys = i[0]
      return keys.userId === 1 && keys.learningObjectId === 1 && keys.loType === 1 && keys.learningObjectVersion === 1 && i[1]?.unique
    })
    expect(hasIndex).toBe(true)
  })
})
