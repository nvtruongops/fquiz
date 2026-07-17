import { AIAsset } from '@/lib/modules/ai/models/AIAsset'
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(null) }))

describe('AIAsset Model', () => {
  it('should have status default queued', () => {
    expect(AIAsset.schema.path('status').options.default).toBe('queued')
  })

  it('should have retryCount default 0', () => {
    expect(AIAsset.schema.path('retryCount').options.default).toBe(0)
  })

  it('should have responseHash for dedup', () => {
    expect(AIAsset.schema.path('responseHash')).toBeDefined()
    expect(AIAsset.schema.path('responseHash').options.required).toBe(true)
  })

  it('should have providerRequestId and providerResponseId', () => {
    expect(AIAsset.schema.path('providerRequestId')).toBeDefined()
    expect(AIAsset.schema.path('providerResponseId')).toBeDefined()
  })
})
