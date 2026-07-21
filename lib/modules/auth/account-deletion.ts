import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'
import { Post } from '@/lib/modules/community/models/Post'
import { QuizComment } from '@/lib/modules/quiz/models/QuizComment'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { LoginLog } from '@/lib/modules/auth/models/LoginLog'
import { Feedback } from '@/lib/modules/auth/models/Feedback'
import { LearningProgress } from '@/lib/modules/learning/models/LearningProgress'
import { AILearningLog } from '@/lib/modules/ai/models/AILearningLog'
import logger from '@/lib/core/utils/logger'

/**
 * Purge a single user and all associated personal data permanently from database
 */
export async function purgeUserData(userId: string): Promise<void> {
  await connectDB()

  logger.info({ userId }, 'Starting permanent deletion of user data...')

  // 1. Delete all Community Posts authored by user
  await Post.deleteMany({ authorId: userId })

  // 2. Remove user comments, likes, and views from remaining Community Posts
  await Post.updateMany(
    {},
    {
      $pull: {
        comments: { authorId: userId },
        likes: userId,
        views: userId,
      },
    }
  )

  // 3. Delete Quiz Comments
  await QuizComment.deleteMany({ user_id: userId })

  // 4. Delete Quiz Sessions
  await QuizSession.deleteMany({ user_id: userId })

  // 5. Delete User Temp Quizzes
  await Quiz.deleteMany({ user_id: userId, is_temp: true })

  // 6. Delete Login Logs & Feedback
  await LoginLog.deleteMany({ user_id: userId })
  await Feedback.deleteMany({ user_id: userId })

  // 7. Delete Learning Progress & AI logs
  await LearningProgress.deleteMany({ createdBy: userId })
  await AILearningLog.deleteMany({ createdBy: userId })

  // 8. Delete User account document permanently
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
