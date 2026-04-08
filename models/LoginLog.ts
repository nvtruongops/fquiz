import mongoose, { Schema } from 'mongoose'
import type { ILoginLog } from '@/types/login-log'

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
// TTL: auto-delete logs older than 30 days
LoginLogSchema.index({ logged_at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

export const LoginLog =
  mongoose.models.LoginLog ??
  mongoose.model<ILoginLog>('LoginLog', LoginLogSchema)

/**
 * Get the start of the current week (Monday 00:00:00 Vietnam time UTC+7).
 */
export function getWeekStartVN(): Date {
  const now = new Date()
  // Convert to Vietnam time offset
  const vnOffset = 7 * 60 * 60 * 1000
  const vnNow = new Date(now.getTime() + vnOffset)
  const dayOfWeek = vnNow.getUTCDay() // 0=Sun, 1=Mon, ...
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(vnNow)
  monday.setUTCDate(monday.getUTCDate() - diffToMonday)
  monday.setUTCHours(0, 0, 0, 0)
  // Convert back to UTC
  return new Date(monday.getTime() - vnOffset)
}

/**
 * Count unique (ip, user_agent) pairs for a user since the start of the week (Monday VN time).
 */
export async function countUniqueDevicesThisWeek(userId: string): Promise<number> {
  const weekStart = getWeekStartVN()
  const result = await LoginLog.aggregate([
    { $match: { user_id: new mongoose.Types.ObjectId(userId), logged_at: { $gte: weekStart } } },
    { $group: { _id: { ip: '$ip', user_agent: '$user_agent' } } },
    { $count: 'total' },
  ])
  return result[0]?.total ?? 0
}
