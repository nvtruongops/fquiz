import { Paragraph } from '@/lib/modules/learning/models/Paragraph'
import type { IParagraph } from '@/lib/modules/learning/types/learning'

export class ParagraphRepository {
  async findById(id: string): Promise<IParagraph | null> {
    return Paragraph.findById(id).lean()
  }

  async findByLesson(lessonId: string): Promise<IParagraph[]> {
    return Paragraph.find({ lessonId, status: 'published' }).sort({ order: 1 }).lean()
  }

  async create(data: Partial<IParagraph>): Promise<IParagraph> {
    return Paragraph.create(data)
  }
}
