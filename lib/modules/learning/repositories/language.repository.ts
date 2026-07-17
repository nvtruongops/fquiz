import { Language } from '@/lib/modules/learning/models/Language'
import type { ILanguage } from '@/lib/modules/learning/types/learning'

export class LanguageRepository {
  async findById(id: string): Promise<ILanguage | null> {
    return Language.findById(id).lean()
  }

  async findByCode(code: string): Promise<ILanguage | null> {
    return Language.findOne({ code }).lean()
  }

  async findAll(): Promise<ILanguage[]> {
    return Language.find({ status: 'published' }).sort({ code: 1 }).lean()
  }

  async create(data: Partial<ILanguage>): Promise<ILanguage> {
    return Language.create(data)
  }

  async upsertByCode(code: string, data: Partial<ILanguage>): Promise<ILanguage> {
    return Language.findOneAndUpdate(
      { code },
      { $set: data },
      { upsert: true, new: true }
    ).lean()
  }
}
