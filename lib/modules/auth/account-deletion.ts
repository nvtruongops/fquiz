import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'
import { LoginLog } from '@/lib/modules/auth/models/LoginLog'
import { Feedback } from '@/lib/modules/auth/models/Feedback'
import { executeUserCleanup } from '@/lib/core/services/user-cleanup-registry'
import logger from '@/lib/core/utils/logger'

/**
 * Purge a single user and all associated personal data permanently from database
 */
export async function purgeUserData(userId: string): Promise<void> {
  await connectDB()

  logger.info({ userId }, 'Starting permanent deletion of user data...')

  // 1. Execute registered cleanup handlers from external modules (community, quiz, learning, ai)
  await executeUserCleanup(userId)

  // 2. Delete Auth module records: Login Logs & Feedback
  await LoginLog.deleteMany({ user_id: userId })
  await Feedback.deleteMany({ user_id: userId })

  // 3. Delete User account document permanently
  await User.deleteOne({ _id: userId })

  logger.info({ userId }, 'Permanent deletion of user data completed successfully.')
}

/**
 * Sweep and purge all accounts in pending_deletion status whose 72h grace period has passed
 */
export async function purgeExpiredDeletedAccounts(): Promise<number> {
  await connectDB()

  const now = new Date()
  const expiredUsers = await User.find({
    status: 'pending_deletion',
    deletion_scheduled_for: { $lte: now },
  }).select('_id username email')

  if (!expiredUsers || expiredUsers.length === 0) {
    return 0
  }

  let count = 0
  for (const user of expiredUsers) {
    try {
      await purgeUserData(user._id.toString())
      count++
    } catch (err) {
      logger.error({ err, userId: user._id }, 'Failed to purge expired user data')
    }
  }

  logger.info({ purgedCount: count }, 'Purged expired deleted accounts')
  return count
}
