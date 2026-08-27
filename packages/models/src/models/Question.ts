import mongoose, { Schema } from 'mongoose'
import type { IQuestionStandalone } from '../entities/quiz.types'
import { ensureExplanation } from '../utils/explanation-generator'

const QuestionSchema = new Schema<IQuestionStandalone>(
  {
    question_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      minlength: [1, 'Câu hỏi không được để trống'],
      maxlength: [10000, 'Câu hỏi tối đa 10000 ký tự'],
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v.length >= 2
        },
        message: 'Cần ít nhất 2 lựa chọn',
      },
    },
    correct_answer: {
      type: [Number],
      required: true,
      validate: {
        validator: function (v: number[]) {
          if (v.length < 1) return false
          // @ts-ignore - this refers to the Question document context
          const optionsLength = this.options?.length ?? 0
          return v.every((i) => i >= 0 && i < optionsLength)
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

export const Question =
  mongoose.models.Question ??
  mongoose.model<IQuestionStandalone>('Question', QuestionSchema)
