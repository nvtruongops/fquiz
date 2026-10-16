/**
 * Classroom Module Bootstrap — Registers all models in the classroom module.
 * This file is imported statically in mongodb.ts to ensure models are initialized.
 */
import { registerModel } from '@/lib/core/db/model-registry'

registerModel(() => {
  // Side-effect import: automatically registers models with Mongoose
  import('./models/Classroom')
  import('./models/ClassroomMember')
  import('./models/QuizAssignment')
  import('./models/QuizAssignmentProgress')
})
