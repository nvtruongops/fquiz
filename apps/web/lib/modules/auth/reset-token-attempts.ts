import type { Types } from 'mongoose'
import { User } from '@/lib/modules/auth/models/User'

export function incrementFailedResetTokenAttempts(userId: Types.ObjectId, resetToken: string | undefined) {
  return User.updateOne(
    {
      _id: userId,
      reset_token: resetToken,
      $or: [
        { reset_token_attempts: { $lt: 5 } },
        { reset_token_attempts: { $exists: false } },
      ],
    },
    { $inc: { reset_token_attempts: 1 } }
  )
}
