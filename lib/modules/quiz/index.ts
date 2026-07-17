/**
 * Quiz Module Bootstrap — Đăng ký tất cả model trong module quiz.
 */
import { registerModel } from '@/lib/core/db/model-registry'

registerModel(() => {
  import('./models/Category')
  import('./models/Quiz')
  import('./models/QuizSession')
  import('./models/QuizComment')
  import('./models/Question')
  import('./models/QuestionBank')
  import('./models/MigrationLog')
})
