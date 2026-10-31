import { getPublishedAnswerError } from '../utils/published-answer'
import mongoose, { Schema } from 'mongoose'
import type { IQuestionStandalone } from '../entities/quiz.types'
import { ensureExplanation } from '../utils/explanation-generator'
import { getQuestionIdentity } from '../utils/question-identity'

const QuestionSchema = new Schema<IQuestionStandalone>(
  {
    question_id: {
      type: String,
      required: true,
      unique: true,
    },
    question_id_aliases: { type: [String], default: undefined },
    text: {
      type: String,
      required: true,
      minlength: [1, 'Question text cannot be empty'],
      maxlength: [10000, 'Question text cannot exceed 10000 characters'],
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v.length >= 2
        },
        message: 'At least 2 options are required',
      },
    },
    correct_answer: {
      type: [Number],
      required: true,
      validate: {
        validator: function (this: any, v: number[]) {
          return getPublishedAnswerError({ text: this.text, options: this.options, correct_answer: v }) === null
        },
        message: 'correct_answer indices must be within options range',
      },
    },
    explanation: { type: String },
    image_url: { type: String },
    source_type: {
      type: String,
      enum: ['manual', 'imported', 'ai_generated'],
      default: 'manual',
    },
    created_by: { type: Schema.Types.ObjectId },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    usage_count: { type: Number, default: 0 },
    quiz_ids: [{ type: Schema.Types.ObjectId }],
    vocabulary_ids: [{ type: Schema.Types.ObjectId }],
    grammar_ids: [{ type: Schema.Types.ObjectId }],
    sentence_ids: [{ type: Schema.Types.ObjectId }],
    language_id: { type: Schema.Types.ObjectId, default: null },
    ai_asset_id: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

QuestionSchema.pre('validate', function () {
  if ((this.isNew || !this.question_id || this.isModified('text') || this.isModified('options')) && this.text && this.options?.length >= 2) Object.assign(this, getQuestionIdentity(this))
})

QuestionSchema.pre('save', function () {
  if (!this.explanation || this.explanation.trim() === '') {
    this.explanation = ensureExplanation({
      text: this.text,
      options: this.options,
      correct_answer: this.correct_answer,
      explanation: this.explanation,
    })
  }
})

QuestionSchema.index({ text: 'text' })
QuestionSchema.index({ usage_count: -1 })
QuestionSchema.index({ quiz_ids: 1 })
QuestionSchema.index({ question_id_aliases: 1 })

export const Question =
  mongoose.models.Question ??
  mongoose.model<IQuestionStandalone>('Question', QuestionSchema)
