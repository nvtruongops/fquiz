import { VocabularyRepository } from '@/lib/modules/learning/repositories/vocabulary.repository'
import type { IVocabulary } from '@/lib/modules/learning/types/learning'
import { eventBus } from '@/lib/modules/learning/events/learning-events'
import { Types } from 'mongoose'

export class VocabularyService {
  constructor(private vocabRepo: VocabularyRepository) {}

  async getById(id: string): Promise<IVocabulary | null> {
    return this.vocabRepo.findById(id)
  }

  async listByLanguage(languageId: string, skip = 0, limit = 20): Promise<IVocabulary[]> {
    return this.vocabRepo.findByLanguage(languageId, skip, limit)
  }

  async listByCEFR(languageId: string, cefrLevel: string, skip = 0, limit = 20): Promise<IVocabulary[]> {
    return this.vocabRepo.findByCEFR(languageId, cefrLevel, skip, limit)
  }

  async findByLemma(languageId: string, lemma: string): Promise<IVocabulary | null> {
    return this.vocabRepo.findByLemma(languageId, lemma)
  }

  async create(data: Partial<IVocabulary>): Promise<IVocabulary> {
    const vocab = await this.vocabRepo.create(data)

    await eventBus.emit({
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      eventType: 'VocabularyCreated',
      occurredAt: new Date(),
      version: 1,
      aggregateId: vocab._id as Types.ObjectId,
      aggregateType: 'Vocabulary',
      payload: { lemma: vocab.lemma, languageId: vocab.languageId.toString(), cefrLevel: vocab.cefrLevel },
    })

    return vocab
  }

  async bulkCreate(items: Partial<IVocabulary>[]): Promise<IVocabulary[]> {
    return this.vocabRepo.bulkCreate(items)
  }

  async update(id: string, data: Partial<IVocabulary>): Promise<IVocabulary | null> {
    return this.vocabRepo.update(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return this.vocabRepo.delete(id)
  }
}
