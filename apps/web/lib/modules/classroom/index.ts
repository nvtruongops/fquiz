/**
 * Classroom Module Bootstrap — Registers all models in the classroom module.
 * This file is imported statically in mongodb.ts to ensure models are initialized.
 */
import { createHmac } from 'node:crypto'
import { Types } from 'mongoose'
import { registerModel } from '@/lib/core/db/model-registry'
import { registerUserCleanupHandler } from '@/lib/core/services/user-cleanup-registry'
import { Classroom } from './models/Classroom'
import { ClassroomMember } from './models/ClassroomMember'
import { QuizAssignment } from './models/QuizAssignment'
import { QuizAssignmentProgress } from './models/QuizAssignmentProgress'

registerModel(() => {
  // Side-effect import: automatically registers models with Mongoose
  import('./models/Classroom')
  import('./models/ClassroomMember')
  import('./models/QuizAssignment')
  import('./models/QuizAssignmentProgress')
})

registerUserCleanupHandler('classroom', async (userId: string) => {
  const originalStudentId = new Types.ObjectId(userId)
  const anonymizationKey = process.env.ANONYMIZATION_KEY
  if (!anonymizationKey || anonymizationKey.trim().length < 32) {
    throw new Error('ANONYMIZATION_KEY must contain at least 32 characters to retain classroom records after account deletion')
  }
  const surrogateId = createHmac('sha256', anonymizationKey)
    .update(`fquiz:classroom-user:v1:${originalStudentId.toString()}`)
    .digest()
    .subarray(0, 12)
  const anonymizedStudentId = new Types.ObjectId(surrogateId)
  await Promise.all([
    ClassroomMember.updateMany(
      { student_id: originalStudentId },
      { $set: { student_id: anonymizedStudentId, is_pinned: false, is_starred: false, tags: [] } },
    ),
    QuizAssignmentProgress.updateMany(
      { student_id: originalStudentId },
      { $set: { student_id: anonymizedStudentId, latest_session_id: null } },
    ),
    Classroom.updateMany(
      { teacher_id: originalStudentId },
      [{
        $set: {
          teacher_id: anonymizedStudentId,
          name: 'Archived classroom',
          code: { $concat: ['ANON-', anonymizedStudentId.toString(), '-', { $toString: '$_id' }] },
          status: 'archived',
          password: null,
          description: '',
          cover_image: null,
          'settings.allow_code_join': false,
        },
      }],
    ),
    QuizAssignment.updateMany(
      { teacher_id: originalStudentId },
      { $set: { teacher_id: anonymizedStudentId, title: 'Archived assignment', description: '', status: 'closed' } },
    ),
  ])
})
