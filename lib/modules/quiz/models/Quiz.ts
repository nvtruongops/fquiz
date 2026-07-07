import mongoose, { Schema } from 'mongoose'
import type { IQuiz, IQuestion } from '@/lib/modules/quiz/types/quiz'
// Import Category to ensure it's registered before Quiz uses it in populate
import '@/lib/modules/quiz/models/Category'

const QuestionSchema = new Schema<IQuestion>(
  {
    question_id: { type: String, required: false }, // Content-based unique ID (generated in pre-save hook)
    text: { 
      type: String, 
      required: true,
      minlength: [1, 'Câu hỏi không được để trống'],
      maxlength: [10000, 'Câu hỏi tối đa 10000 ký tự']
    },
    options: { 
      type: [String], 
      required: true,
      validate: {
        validator: function(v: string[]) {
          return v.length >= 2;
        },
        message: 'Cần ít nhất 2 lựa chọn'
      }
    },
    correct_answer: { 
      type: [Number], 
      required: true,
      validate: {
        validator: function(v: number[]) {
          return v.length >= 1;
        },
        message: 'Cần ít nhất 1 đáp án đúng'
      }
    },
    explanation: { type: String },
    image_url: { type: String },
  },
  {
    // Preserve _id on each embedded question
    _id: true,
  }
)

const QuizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    course_code: { type: String, required: true },
    questions: { type: [QuestionSchema], required: false, default: [] },
    questionCount: { type: Number, default: 0 },
    studentCount: { type: Number, default: 0 },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now },
    status: { type: String, enum: ['published', 'draft'], default: 'published' },
    is_public: { type: Boolean, default: false },
    price: { type: Number, default: 0 },
    original_quiz_id: { type: Schema.Types.ObjectId, ref: 'Quiz' },
    is_saved_from_explore: { type: Boolean, default: false },
    is_temp: { type: Boolean, default: false },
    expires_at: { type: Date, required: false },
    mix_config: {
      quiz_ids: [{ type: Schema.Types.ObjectId, ref: 'Quiz' }],
      question_count: { type: Number },
      mode: { type: String, enum: ['immediate', 'review', 'flashcard'] },
      category_id: { type: Schema.Types.ObjectId, ref: 'Category' },
    },
  },
  { timestamps: true }
)

// Optimized indexes for Explore/Search
// ... (omitted for brevity in replacement but kept in file) ...
QuizSchema.index({ category_id: 1, status: 1, studentCount: -1 })
QuizSchema.index({ title: 'text', course_code: 'text' })
QuizSchema.index(
  { created_by: 1, course_code: 1 },
  {
    unique: true,
    partialFilterExpression: {
      is_saved_from_explore: { $ne: true },
      created_by: { $exists: true },
    },
  }
)
QuizSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0, sparse: true })

QuizSchema.pre('validate', function () {
  if (typeof this.course_code === 'string') {
    this.course_code = this.course_code.trim().toUpperCase()
  }
})

QuizSchema.pre('save', function () {
  if (this.questions && this.questions.length > 0) {
    this.questionCount = this.questions.length
    const { generateQuestionId } = require('@/lib/modules/quiz/question-id-generator')
    this.questions.forEach((q: any) => {
      if (!q.question_id && q.text && q.options) {
        q.question_id = generateQuestionId({
          text: q.text,
          options: q.options,
          correct_answer: q.correct_answer || []
        })
      }
    })
  }
})

if (mongoose.models.Quiz) {
  delete mongoose.models.Quiz;
}

export const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema);
