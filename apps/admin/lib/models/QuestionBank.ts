import mongoose, { Schema, Document } from 'mongoose'

export interface IQuestionBank extends Document {
  _id: mongoose.Types.ObjectId
  category_id: mongoose.Types.ObjectId
  question_id: string
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string
  created_by: mongoose.Types.ObjectId
  created_at: Date
  updated_at: Date
  usage_count: number
  used_in_quizzes: string[]
  used_in_quiz_ids: mongoose.Types.ObjectId[]
  has_conflicts: boolean
  conflict_notes?: string
}

const QuestionBankSchema = new Schema<IQuestionBank>(
  {
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    question_id: { type: String, required: true, index: true },
    text: { type: String, required: true },
    options: { type: [String], required: true },
    correct_answer: { type: [Number], required: true },
    explanation: { type: String },
    image_url: { type: String },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    usage_count: { type: Number, default: 0 },
    used_in_quizzes: { type: [String], default: [] },
    used_in_quiz_ids: [{ type: Schema.Types.ObjectId, ref: 'Quiz' }],
    has_conflicts: { type: Boolean, default: false },
    conflict_notes: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

QuestionBankSchema.index({ category_id: 1, question_id: 1 }, { unique: true })
QuestionBankSchema.index({ category_id: 1, has_conflicts: 1 })

export const QuestionBank =
  (mongoose.models.QuestionBank as mongoose.Model<IQuestionBank>) ??
  mongoose.model<IQuestionBank>('QuestionBank', QuestionBankSchema)
