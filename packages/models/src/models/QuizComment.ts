import mongoose, { Schema, Document } from 'mongoose'

export interface IQuizComment extends Document {
  quiz_id: mongoose.Types.ObjectId
  user_id: mongoose.Types.ObjectId
  content: string
  created_at: Date
}

const QuizCommentSchema = new Schema<IQuizComment>(
  {
    quiz_id: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 1000 },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

QuizCommentSchema.index({ quiz_id: 1, created_at: -1 })

export const QuizComment =
  mongoose.models.QuizComment ?? mongoose.model<IQuizComment>('QuizComment', QuizCommentSchema)
