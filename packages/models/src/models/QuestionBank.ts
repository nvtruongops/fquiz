import { getPublishedAnswerError } from '../utils/published-answer'
import mongoose, { Schema } from 'mongoose'
import type { IQuestionBank } from '../entities/quiz.types'
import { getQuestionIdentity } from '../utils/question-identity'

export type { IQuestionBank }
export type QuestionBankDoc = IQuestionBank

const QuestionBankSchema = new Schema<IQuestionBank>(
  {
    category_id: { 
      type: Schema.Types.ObjectId, 
      ref: 'Category', 
      required: true
    },
    question_id: { 
      type: String, 
      required: true,
      index: true
    },
    question_id_aliases: { type: [String], default: undefined },
    text: { type: String, required: true },
    options: { type: [String], required: true },
    correct_answer: { type: [Number], required: true, validate: {
      validator: function(this: any, v: number[]) {
        return getPublishedAnswerError({ text: this.text, options: this.options, correct_answer: v }) === null
      },
      message: 'Invalid published answer key',
    } },
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

QuestionBankSchema.pre('validate', function () {
  if ((this.isNew || !this.question_id || this.isModified('text') || this.isModified('options')) && this.text && this.options?.length >= 2) Object.assign(this, getQuestionIdentity(this))
})

export const QuestionBank = 
  mongoose.models.QuestionBank ?? 
  mongoose.model<IQuestionBank>('QuestionBank', QuestionBankSchema)
