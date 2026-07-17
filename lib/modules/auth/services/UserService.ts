import mongoose from 'mongoose'
import { User } from '@/lib/modules/auth/models/User'
import type { IUserService } from '@/lib/modules/quiz/services/IUserService'

/**
 * UserService — Implement IUserService cho Auth module.
 * Đây là implementation DUY NHẤT được phép gọi User model trực tiếp.
 */
export class UserService implements IUserService {
  async getUsernames(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map()

    const objectIds = userIds.map((id) => new mongoose.Types.ObjectId(id))
    const users = await User.find({ _id: { $in: objectIds } }, { username: 1 }).lean()

    return new Map(
      (users as any[]).map((u) => [u._id.toString(), u.username])
    )
  }
}
