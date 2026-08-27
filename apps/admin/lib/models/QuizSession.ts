import mongoose, { Schema, Document } from 'mongoose'

export interface IQuizSession extends Document {
  _id: mongoose.Types.ObjectId
  quiz_id: mongoose.Types.ObjectId
  student_id: mongoose.Types.ObjectId
  status: 'in_progress' | 'completed' | 'abandoned'
  score?: number
  created_at: Date
  completed_at?: Date
}

const QuizSessionSchema = new Schema<IQuizSession>(
  {
    quiz_id: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress' },
    score: { type: Number },
    created_at: { type: Date, default: Date.now },
    completed_at: { type: Date },
  },
  { timestamps: false }
)

QuizSessionSchema.index({ status: 1 })

export const QuizSession =
  (mongoose.models.QuizSession as mongoose.Model<IQuizSession>) ??
  mongoose.model<IQuizSession>('QuizSession', QuizSessionSchema)
