import mongoose, { Schema } from 'mongoose'
import type { Types } from 'mongoose'

export interface IQuestionBank {
  _id: Types.ObjectId
  category_id: Types.ObjectId
  question_id: string
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string
  created_by: Types.ObjectId
  created_at: Date
  updated_at: Date
  usage_count: number
  used_in_quizzes: string[]
  used_in_quiz_ids: Types.ObjectId[]
  has_conflicts: boolean
  conflict_notes?: string
}

export type QuestionBankDoc = IQuestionBank

const QuestionBankSchema = new Schema<IQuestionBank>(
  {
    category_id: { 
      type: Schema.Types.ObjectId, 
      ref: 'Category', 
      required: true,
      index: true
    },
    question_id: { 
      type: String, 
      required: true,
      index: true
    },
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
  },
  { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
)

QuestionBankSchema.index(
  { category_id: 1, question_id: 1 }, 
  { unique: true }
)
QuestionBankSchema.index({ text: 'text' })
QuestionBankSchema.index({ category_id: 1, usage_count: -1 })
QuestionBankSchema.index({ used_in_quiz_ids: 1 })
QuestionBankSchema.index({ used_in_quizzes: 1 })

export const QuestionBank = 
  mongoose.models.QuestionBank ?? 
  mongoose.model<IQuestionBank>('QuestionBank', QuestionBankSchema)
