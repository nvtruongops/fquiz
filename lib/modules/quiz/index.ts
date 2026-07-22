/**
 * Quiz Module Bootstrap — Đăng ký tất cả model trong module quiz.
 */
import { registerModel } from '@/lib/core/db/model-registry'
import { registerUserCleanupHandler } from '@/lib/core/services/user-cleanup-registry'
import { QuizComment } from './models/QuizComment'
import { QuizSession } from './models/QuizSession'
import { Quiz } from './models/Quiz'

registerModel(() => {
  import('./models/Category')
  import('./models/Quiz')
  import('./models/QuizSession')
  import('./models/QuizComment')
  import('./models/Question')
  import('./models/QuestionBank')
  import('./models/MigrationLog')
})

registerUserCleanupHandler('quiz', async (userId: string) => {
  await QuizComment.deleteMany({ user_id: userId })
  await QuizSession.deleteMany({ user_id: userId })
  await Quiz.deleteMany({ user_id: userId, is_temp: true })
})
