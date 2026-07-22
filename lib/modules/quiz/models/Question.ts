import mongoose, { Schema } from 'mongoose'
import type { IQuestionStandalone } from '@/lib/modules/quiz/types/quiz'
import { ensureExplanation } from '@/lib/modules/quiz/explanation-generator'

/**
 * Question – Bộ sưu tập câu hỏi độc lập (Standalone Question Collection)
 *
 * Tách biệt hoàn toàn khỏi Quiz để:
 * - Tái sử dụng câu hỏi giữa các đề thi
 * - Hỗ trợ liên kết với Learning Objects (Vocabulary, Grammar) trong Phase 2
 * - Giảm kích thước document Quiz, tránh vượt giới hạn 16MB MongoDB
 *
 * Loose Coupling: Không import model từ module khác.
 * Dùng application-level joins qua question_ids khi cần.
 */
const QuestionSchema = new Schema<IQuestionStandalone>(
  {
    question_id: {
      type: String,
      required: true,
      unique: true,
      index: true, // Content-based unique ID để deduplication
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

    // --- Metadata ---
    source_type: {
      type: String,
      enum: ['manual', 'imported', 'ai_generated'],
      default: 'manual',
    },
    created_by: { type: Schema.Types.ObjectId },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },

    // --- Usage Tracking ---
    usage_count: { type: Number, default: 0 },
    quiz_ids: [{ type: Schema.Types.ObjectId }], // Các Quiz sử dụng câu hỏi này

    // --- Learning Links (Phase 2) ---
    // ⚠️ TEMPORARY COMPATIBILITY FIELDS — Phase 2 Double-Write
    // Về lâu dài (Phase 4+): thay bằng QuestionContentRelation JOIN TABLE
    vocabulary_ids: [{ type: Schema.Types.ObjectId }],
    grammar_ids: [{ type: Schema.Types.ObjectId }],
    sentence_ids: [{ type: Schema.Types.ObjectId }],
    language_id: { type: Schema.Types.ObjectId, default: null },
    ai_asset_id: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

// Auto-generate explanation if missing before saving
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

// Indexes
QuestionSchema.index({ text: 'text' }) // Text search
QuestionSchema.index({ usage_count: -1 }) // Popular questions
QuestionSchema.index({ quiz_ids: 1 }) // Tìm câu hỏi theo quiz

// Đăng ký model an toàn (Next.js hot-reload proof)
export const Question =
  mongoose.models.Question ??
  mongoose.model<IQuestionStandalone>('Question', QuestionSchema)
