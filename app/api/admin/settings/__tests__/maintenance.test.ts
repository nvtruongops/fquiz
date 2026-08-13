import { clearSettingsCache, getSettings, SiteSettings } from '@/lib/modules/auth/models/SiteSettings'

// Mock MongoDB connection
jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(null),
}))

describe('Maintenance Mode Cache Invalidation Integration', () => {
  let findOneSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    clearSettingsCache()
  })

  afterEach(() => {
    findOneSpy?.mockRestore()
  })

  it('should reflect immediate maintenance mode enable after clearSettingsCache()', async () => {
    let mockDoc: any = { app_name: 'FQuiz', maintenance_mode: false, llm_config: {} }
    findOneSpy = jest.spyOn(SiteSettings, 'findOne').mockImplementation(() => ({
      lean: jest.fn().mockImplementation(() => Promise.resolve(mockDoc)),
    }) as any)

    const s1 = await getSettings()
    expect(s1.maintenance_mode).toBe(false)
    expect(findOneSpy).toHaveBeenCalledTimes(1)

    // Second call within TTL should return cached value without DB query
    const s2 = await getSettings()
    expect(s2.maintenance_mode).toBe(false)
    expect(findOneSpy).toHaveBeenCalledTimes(1)

    // Admin updates DB setting to enable maintenance and calls clearSettingsCache()
    mockDoc = { app_name: 'FQuiz', maintenance_mode: true, llm_config: {} }
    clearSettingsCache()

    // Next request fetches fresh settings immediately
    const s3 = await getSettings()
    expect(s3.maintenance_mode).toBe(true)
    expect(findOneSpy).toHaveBeenCalledTimes(2)
  })
})
