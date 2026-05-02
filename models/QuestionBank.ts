import mongoose, { Schema } from 'mongoose'
import type { Types } from 'mongoose'

/**
 * QuestionBank: Ngân hàng câu hỏi theo môn học
 * Mỗi category có 1 bộ câu hỏi riêng để tránh mâu thuẫn đáp án
 */
export interface IQuestionBank {
  _id: Types.ObjectId
  category_id: Types.ObjectId           // Thuộc môn học nào
  question_id: string                   // Content-based unique ID
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string
  
  // Metadata
  created_by: Types.ObjectId
  created_at: Date
  updated_at: Date
  
  // Usage tracking
  usage_count: number                   // Số lần được dùng
  used_in_quizzes: string[]            // Danh sách course_code đã dùng
  
  // Conflict detection
  has_conflicts: boolean                // Có mâu thuẫn với câu khác không
  conflict_notes?: string               // Ghi chú về mâu thuẫn
}

const QuestionBankSchema = new Schema<IQuestionBank>(
  {
    category_id: { 
      type: Schema.Types.ObjectId, 
      ref: 'Category', 
      required: true,
      index: true  // Index để search nhanh theo môn
    },
    question_id: { 
      type: String, 
      required: true,
      index: true  // Index để check duplicate nhanh
    },
    text: { type: String, required: true },
    options: { type: [String], required: true },
    correct_answer: { type: [Number], required: true },
    explanation: { type: String },
    image_url: { type: String },
    
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    usage_count: { type: Number, default: 0 },
    used_in_quizzes: { type: [String], default: [] },
    
    has_conflicts: { type: Boolean, default: false },
    conflict_notes: { type: String },
  },
  { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
)

// Compound unique index: 1 category chỉ có 1 question_id duy nhất
QuestionBankSchema.index(
  { category_id: 1, question_id: 1 }, 
  { unique: true }
)

// Index để search text
QuestionBankSchema.index({ text: 'text' })

// Index để tìm câu hỏi phổ biến
QuestionBankSchema.index({ category_id: 1, usage_count: -1 })

export const QuestionBank = 
  mongoose.models.QuestionBank ?? 
  mongoose.model<IQuestionBank>('QuestionBank', QuestionBankSchema)
