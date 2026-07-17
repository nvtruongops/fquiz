import { Lesson } from '@/lib/modules/learning/models/Lesson'
import type { ILesson } from '@/lib/modules/learning/types/learning'

export class LessonRepository {
  async findById(id: string): Promise<ILesson | null> {
    return Lesson.findById(id).lean()
  }

  async findByModule(moduleId: string): Promise<ILesson[]> {
    return Lesson.find({ moduleId, status: 'published' }).sort({ order: 1 }).lean()
  }

  async findByPrerequisite(prerequisiteId: string): Promise<ILesson[]> {
    return Lesson.find({ prerequisites: prerequisiteId, status: 'published' }).lean()
  }

  async create(data: Partial<ILesson>): Promise<ILesson> {
    return Lesson.create(data)
  }

  async update(id: string, data: Partial<ILesson>): Promise<ILesson | null> {
    return Lesson.findByIdAndUpdate(id, { $set: data }, { new: true }).lean()
  }

  async delete(id: string): Promise<boolean> {
    const res = await Lesson.findByIdAndDelete(id)
    return !!res
  }
}
