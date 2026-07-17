/**
 * Auth Module Bootstrap — Đăng ký tất cả model trong module auth.
 * File này được import tĩnh trong mongodb.ts để đảm bảo model sẵn sàng.
 */
import { registerModel } from '@/lib/core/db/model-registry'

registerModel(() => {
  // Side-effect import: tự động đăng ký model với Mongoose
  import('./models/User')
  import('./models/EmailVerification')
  import('./models/LoginLog')
  import('./models/SiteSettings')
  import('./models/Feedback')
})
