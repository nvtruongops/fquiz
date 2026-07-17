import { Module } from '@/lib/modules/learning/models/Module'
import type { IModule } from '@/lib/modules/learning/types/learning'

export class ModuleRepository {
  async findById(id: string): Promise<IModule | null> {
    return Module.findById(id).lean()
  }

  async findByCourse(courseId: string): Promise<IModule[]> {
    return Module.find({ courseId, status: 'published' }).sort({ order: 1 }).lean()
  }

  async create(data: Partial<IModule>): Promise<IModule> {
    return Module.create(data)
  }
}
