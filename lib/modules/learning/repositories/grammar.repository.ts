import { GrammarPattern } from '@/lib/modules/learning/models/GrammarPattern'
import type { IGrammarPattern } from '@/lib/modules/learning/types/learning'

export class GrammarRepository {
  async findById(id: string): Promise<IGrammarPattern | null> {
    return GrammarPattern.findById(id).lean()
  }

  async findByIds(ids: string[]): Promise<IGrammarPattern[]> {
    return GrammarPattern.find({ _id: { $in: ids } }).lean()
  }

  async findByName(languageId: string, name: string): Promise<IGrammarPattern | null> {
    return GrammarPattern.findOne({ languageId, name }).lean()
  }

  async findByLanguage(languageId: string): Promise<IGrammarPattern[]> {
    return GrammarPattern.find({ languageId, status: 'published' }).lean()
  }

  async findByCEFR(languageId: string, cefrLevel: string): Promise<IGrammarPattern[]> {
    return GrammarPattern.find({ languageId, cefrLevel, status: 'published' }).lean()
  }

  async create(data: Partial<IGrammarPattern>): Promise<IGrammarPattern> {
    return GrammarPattern.create(data)
  }
}
