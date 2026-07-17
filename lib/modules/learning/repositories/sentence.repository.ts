import { Sentence } from '@/lib/modules/learning/models/Sentence'
import type { ISentence } from '@/lib/modules/learning/types/learning'

export class SentenceRepository {
  async findById(id: string): Promise<ISentence | null> {
    return Sentence.findById(id).lean()
  }

  async findByIds(ids: string[]): Promise<ISentence[]> {
    return Sentence.find({ _id: { $in: ids } }).lean()
  }

  async findByChecksum(checksum: string, languageId: string): Promise<ISentence | null> {
    return Sentence.findOne({ checksum, languageId }).lean()
  }

  async findByLanguage(languageId: string, skip = 0, limit = 20): Promise<ISentence[]> {
    return Sentence.find({ languageId, status: 'published' }).skip(skip).limit(limit).lean()
  }

  async create(data: Partial<ISentence>): Promise<ISentence> {
    return Sentence.create(data)
  }

  async bulkCreate(items: Partial<ISentence>[]): Promise<ISentence[]> {
    return Sentence.insertMany(items) as any
  }

  async update(id: string, data: Partial<ISentence>): Promise<ISentence | null> {
    return Sentence.findByIdAndUpdate(id, { $set: data }, { new: true }).lean()
  }

  async delete(id: string): Promise<boolean> {
    const res = await Sentence.findByIdAndDelete(id)
    return !!res
  }
}
