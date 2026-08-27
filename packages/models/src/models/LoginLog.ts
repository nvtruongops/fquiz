import mongoose, { Schema } from 'mongoose'
import type { ILoginLog } from '../entities/login-log.types'

const LoginLogSchema = new Schema<ILoginLog>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ip: { type: String, required: true },
    user_agent: { type: String, required: true, default: 'unknown' },
    logged_at: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
)

LoginLogSchema.index({ user_id: 1, logged_at: -1 })
LoginLogSchema.index({ logged_at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

export const LoginLog =
  mongoose.models.LoginLog ??
  mongoose.model<ILoginLog>('LoginLog', LoginLogSchema)

export function getWeekStartVN(): Date {
  const now = new Date()
  const vnOffset = 7 * 60 * 60 * 1000
  const vnNow = new Date(now.getTime() + vnOffset)
  const dayOfWeek = vnNow.getUTCDay()
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(vnNow)
  monday.setUTCDate(monday.getUTCDate() - diffToMonday)
  monday.setUTCHours(0, 0, 0, 0)
  return new Date(monday.getTime() - vnOffset)
}

export async function countUniqueDevicesThisWeek(userId: string): Promise<number> {
  const weekStart = getWeekStartVN()
  const result = await LoginLog.aggregate([
    { $match: { user_id: new mongoose.Types.ObjectId(userId), logged_at: { $gte: weekStart } } },
    { $group: { _id: { ip: '$ip', user_agent: '$user_agent' } } },
    { $count: 'total' },
  ])
  return result[0]?.total ?? 0
}
