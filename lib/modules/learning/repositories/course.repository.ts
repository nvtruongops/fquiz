import { Course } from '@/lib/modules/learning/models/Course'
import type { ICourse } from '@/lib/modules/learning/types/learning'

export class CourseRepository {
  async findById(id: string): Promise<ICourse | null> {
    return Course.findById(id).lean()
  }

  async findByLanguage(languageId: string): Promise<ICourse[]> {
    return Course.find({ languageId, status: 'published' }).lean()
  }

  async findByCEFR(languageId: string, cefrLevel: string): Promise<ICourse[]> {
    return Course.find({ languageId, cefrLevel, status: 'published' }).lean()
  }

  async findByTopic(topicId: string): Promise<ICourse[]> {
    return Course.find({ topicId, status: 'published' }).lean()
  }

  async create(data: Partial<ICourse>): Promise<ICourse> {
    return Course.create(data)
  }

  async update(id: string, data: Partial<ICourse>): Promise<ICourse | null> {
    return Course.findByIdAndUpdate(id, { $set: data }, { new: true }).lean()
  }

  async delete(id: string): Promise<boolean> {
    const res = await Course.findByIdAndDelete(id)
    return !!res
  }
}
