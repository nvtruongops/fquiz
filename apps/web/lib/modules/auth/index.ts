/**
 * Auth Module Bootstrap — Registers all models in the auth module.
 * This file is statically imported in mongodb.ts to ensure models are ready.
 */
import { registerModel } from '@/lib/core/db/model-registry'

registerModel(() => {
  // Side-effect import: automatically registers models with Mongoose
  import('./models/User')
  import('./models/EmailVerification')
  import('./models/LoginLog')
  import('./models/SiteSettings')
  import('./models/Feedback')
})
