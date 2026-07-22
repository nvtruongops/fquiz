import mongoose, { Schema } from 'mongoose'
import type { IQuizAssignment } from '@/lib/modules/classroom/types/classroom'

const QuizAssignmentSchema = new Schema<IQuizAssignment>(
  {
    classroom_id: { type: Schema.Types.ObjectId, ref: 'Classroom', required: true, index: true },
    quiz_id: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    teacher_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    start_at: { type: Date, default: null },
    due_at: { type: Date, default: null },
    time_limit_minutes: { type: Number, default: 0 },
    max_attempts: { type: Number, default: 0 },
    pass_score_percent: { type: Number, default: 70 },
    show_answers_immediately: { type: Boolean, default: true },
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'published', index: true },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

QuizAssignmentSchema.index({ classroom_id: 1, status: 1, due_at: 1 })

if (process.env.NODE_ENV === 'development' && mongoose.models.QuizAssignment) {
  delete mongoose.models.QuizAssignment
}

export const QuizAssignment =
  mongoose.models.QuizAssignment ?? mongoose.model<IQuizAssignment>('QuizAssignment', QuizAssignmentSchema)
