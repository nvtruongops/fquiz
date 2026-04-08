import mongoose, { Schema } from 'mongoose'
import type { IQuizSession, UserAnswer } from '@/types/session'

const UserAnswerSchema = new Schema<UserAnswer>(
  {
    question_index: { type: Number, required: true },
    answer_index: { type: Number, required: true },
    answer_indexes: { type: [Number], required: false, default: undefined },
    is_correct: { type: Boolean, required: true },
  },
  { _id: false }
)

const QuizSessionSchema = new Schema<IQuizSession>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quiz_id: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    mode: { type: String, enum: ['immediate', 'review'], required: true },
    status: { type: String, enum: ['active', 'completed'], required: true, default: 'active' },
    user_answers: { type: [UserAnswerSchema], default: [] },
    current_question_index: { type: Number, required: true, default: 0 },
    score: { type: Number, required: true, default: 0 },
    expires_at: { type: Date, required: true },
    started_at: { type: Date, required: true, default: Date.now },
    completed_at: { type: Date },
    last_activity_at: { type: Date, default: Date.now },
    paused_at: { type: Date },
  },
  { timestamps: false }
)

// TTL index — MongoDB auto-deletes expired sessions
QuizSessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 })
// Compound index for student session lookups
QuizSessionSchema.index({ student_id: 1, quiz_id: 1 })

export const QuizSession =
  mongoose.models.QuizSession ??
  mongoose.model<IQuizSession>('QuizSession', QuizSessionSchema)
