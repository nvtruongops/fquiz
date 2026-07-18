/**
 * Integration test: Registry → Repository → MongoDB
 *
 * Tests the full chain for Language and Topic:
 * 1. Model Registry bootstrap
 * 2. Repository layer
 * 3. Mongoose Model operations (mocked)
 */
import { bootstrapModels, registerModel } from '@/lib/core/db/model-registry'
import { LanguageRepository } from '@/lib/modules/learning/repositories/language.repository'
import { TopicRepository } from '@/lib/modules/learning/repositories/topic.repository'

jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(null) }))

describe('Integration: Registry → Repository', () => {
  describe('Model Registry', () => {
    it('should register and bootstrap learning models', async () => {
      // Verify models are registered when imported
      const Language = (await import('@/lib/modules/learning/models/Language')).Language
      expect(Language).toBeDefined()
      expect(Language.modelName).toBe('Language')
    })

    it('should have all Sprint 1 models registered', async () => {
      const modelImports = {
        Language: (await import('@/lib/modules/learning/models/Language')).Language,
        Topic: (await import('@/lib/modules/learning/models/Topic')).Topic,
        Course: (await import('@/lib/modules/learning/models/Course')).Course,
        Module: (await import('@/lib/modules/learning/models/Module')).Module,
        Lesson: (await import('@/lib/modules/learning/models/Lesson')).Lesson,
        LearningTag: (await import('@/lib/modules/learning/models/LearningTag')).LearningTag,
      } as const

      for (const [name, Model] of Object.entries(modelImports)) {
        expect(Model).toBeDefined()
        expect(Model.modelName).toBe(name)
      }
    })
  })

  describe('LanguageRepository', () => {
    it('should expose findByCode method', () => {
      const repo = new LanguageRepository()
      expect(typeof repo.findByCode).toBe('function')
      expect(typeof repo.findAll).toBe('function')
      expect(typeof repo.create).toBe('function')
      expect(typeof repo.upsertByCode).toBe('function')
    })
  })

  describe('TopicRepository', () => {
    it('should expose findBySlug and findByPath', () => {
      const repo = new TopicRepository()
      expect(typeof repo.findBySlug).toBe('function')
      expect(typeof repo.findByPath).toBe('function')
      expect(typeof repo.findChildren).toBe('function')
    })
  })
})
