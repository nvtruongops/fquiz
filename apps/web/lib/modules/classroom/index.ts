/**
 * Classroom Module Bootstrap — Đăng ký tất cả model trong module classroom.
 * File này được import tĩnh trong mongodb.ts để đảm bảo model sẵn sàng.
 */
import { registerModel } from '@/lib/core/db/model-registry'

registerModel(() => {
  // Side-effect import: tự động đăng ký model với Mongoose
  import('./models/Classroom')
  import('./models/ClassroomMember')
  import('./models/QuizAssignment')
  import('./models/QuizAssignmentProgress')
})
