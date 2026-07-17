import { Vocabulary } from '@/lib/modules/learning/models/Vocabulary'
import type { IVocabulary } from '@/lib/modules/learning/types/learning'

export class VocabularyRepository {
  async findById(id: string): Promise<IVocabulary | null> {
    return Vocabulary.findById(id).lean()
  }

  async findByIds(ids: string[]): Promise<IVocabulary[]> {
    return Vocabulary.find({ _id: { $in: ids } }).lean()
  }

  async findByLemma(languageId: string, lemma: string): Promise<IVocabulary | null> {
    const normalized = lemma.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return Vocabulary.findOne({ languageId, normalizedLemma: normalized }).lean()
  }

  async findByLanguage(languageId: string, skip = 0, limit = 20): Promise<IVocabulary[]> {
    return Vocabulary.find({ languageId, status: 'published' })
      .sort({ frequency: 1 }).skip(skip).limit(limit).lean()
  }

  async findByCEFR(languageId: string, cefrLevel: string, skip = 0, limit = 20): Promise<IVocabulary[]> {
    return Vocabulary.find({ languageId, cefrLevel, status: 'published' })
      .sort({ difficulty: 1 }).skip(skip).limit(limit).lean()
  }

  async create(data: Partial<IVocabulary>): Promise<IVocabulary> {
    return Vocabulary.create(data)
  }

  async bulkCreate(items: Partial<IVocabulary>[]): Promise<IVocabulary[]> {
    return Vocabulary.insertMany(items) as any
  }

  async update(id: string, data: Partial<IVocabulary>): Promise<IVocabulary | null> {
    return Vocabulary.findByIdAndUpdate(id, { $set: data }, { new: true }).lean()
  }

  async delete(id: string): Promise<boolean> {
    const res = await Vocabulary.findByIdAndDelete(id)
    return !!res
  }
}
