import mongoose, { Schema } from 'mongoose'
import type { IQuizAssignmentProgress } from '@/lib/modules/classroom/types/classroom'

const QuizAssignmentProgressSchema = new Schema<IQuizAssignmentProgress>(
  {
    assignment_id: { type: Schema.Types.ObjectId, ref: 'QuizAssignment', required: true, index: true },
    classroom_id: { type: Schema.Types.ObjectId, ref: 'Classroom', required: true, index: true },
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    latest_session_id: { type: Schema.Types.ObjectId, ref: 'QuizSession', default: null },
    best_score: { type: Number, default: 0 },
    attempts_count: { type: Number, default: 0 },
    is_passed: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'overdue'],
      default: 'not_started',
      index: true,
    },
    submitted_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

QuizAssignmentProgressSchema.index({ assignment_id: 1, student_id: 1 }, { unique: true })
QuizAssignmentProgressSchema.index({ classroom_id: 1, student_id: 1 })

if (process.env.NODE_ENV === 'development' && mongoose.models.QuizAssignmentProgress) {
  delete mongoose.models.QuizAssignmentProgress
}

export const QuizAssignmentProgress =
  mongoose.models.QuizAssignmentProgress ??
  mongoose.model<IQuizAssignmentProgress>('QuizAssignmentProgress', QuizAssignmentProgressSchema)
