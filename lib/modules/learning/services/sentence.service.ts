import { SentenceRepository } from '@/lib/modules/learning/repositories/sentence.repository'
import { VocabularyRepository } from '@/lib/modules/learning/repositories/vocabulary.repository'
import { GrammarRepository } from '@/lib/modules/learning/repositories/grammar.repository'
import { SentenceReadRepository, type SentenceWithRelations } from '@/lib/modules/learning/repositories/sentence-read.repository'
import type { ISentence } from '@/lib/modules/learning/types/learning'

export class SentenceService {
  private readRepo: SentenceReadRepository

  constructor(
    private sentenceRepo: SentenceRepository,
    vocabRepo: VocabularyRepository,
    grammarRepo: GrammarRepository,
  ) {
    this.readRepo = new SentenceReadRepository(sentenceRepo, vocabRepo, grammarRepo)
  }

  async getById(id: string): Promise<ISentence | null> {
    return this.sentenceRepo.findById(id)
  }

  async listByLanguage(languageId: string, skip = 0, limit = 20): Promise<ISentence[]> {
    return this.sentenceRepo.findByLanguage(languageId, skip, limit)
  }

  /** Lấy sentence kèm toàn bộ vocabulary + grammar + paragraph links */
  async getWithRelations(sentenceId: string): Promise<SentenceWithRelations | null> {
    return this.readRepo.getSentenceWithRelations(sentenceId)
  }

  /** Lấy tất cả sentences trong paragraph kèm relations */
  async getParagraphSentences(paragraphId: string): Promise<SentenceWithRelations[]> {
    return this.readRepo.getParagraphSentencesWithRelations(paragraphId)
  }

  async create(data: Partial<ISentence>): Promise<ISentence> {
    return this.sentenceRepo.create(data)
  }

  async createWithVocabLinks(
    sentenceData: Partial<ISentence>,
    vocabLinks: Array<{ vocabularyId: string; senseId?: string; position?: number; meaningInContext?: string }>,
  ): Promise<ISentence> {
    const sentence = await this.sentenceRepo.create(sentenceData)
    const { SentenceVocabulary } = await import('@/lib/modules/learning/models/SentenceVocabulary')

    if (vocabLinks.length > 0) {
      await SentenceVocabulary.insertMany(
        vocabLinks.map((link) => ({
          sentenceId: sentence._id,
          vocabularyId: link.vocabularyId,
          senseId: link.senseId || null,
          position: link.position || null,
          meaningInContext: link.meaningInContext || null,
          status: 'published',
          schemaVersion: 1,
          contentVersion: 1,
          metadata: {},
        })),
      )
    }

    return sentence
  }

  async update(id: string, data: Partial<ISentence>): Promise<ISentence | null> {
    return this.sentenceRepo.update(id, data)
  }

  async delete(id: string): Promise<boolean> {
    return this.sentenceRepo.delete(id)
  }
}
