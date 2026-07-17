import { Topic } from '@/lib/modules/learning/models/Topic'
import type { ITopic } from '@/lib/modules/learning/types/learning'

export class TopicRepository {
  async findById(id: string): Promise<ITopic | null> {
    return Topic.findById(id).lean()
  }

  async findBySlug(slug: string): Promise<ITopic | null> {
    return Topic.findOne({ slug }).lean()
  }

  async findByPath(path: string): Promise<ITopic[]> {
    return Topic.find({ path: { $regex: `^${path}` } }).lean()
  }

  async findChildren(parentTopicId: string): Promise<ITopic[]> {
    return Topic.find({ parentTopicId }).lean()
  }

  async findAll(): Promise<ITopic[]> {
    return Topic.find({ status: 'published' }).sort({ path: 1 }).lean()
  }

  async create(data: Partial<ITopic>): Promise<ITopic> {
    return Topic.create(data)
  }

  async upsertBySlug(slug: string, data: Partial<ITopic>): Promise<ITopic> {
    return Topic.findOneAndUpdate(
      { slug },
      { $set: data },
      { upsert: true, new: true }
    ).lean()
  }
}
