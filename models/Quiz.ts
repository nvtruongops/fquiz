import mongoose, { Schema } from 'mongoose'
import type { IQuiz, IQuestion } from '@/types/quiz'

const QuestionSchema = new Schema<IQuestion>(
  {
    text: { type: String, required: false },
    options: { type: [String], required: false, default: [] },
    correct_answer: { type: [Number], required: false, default: [] },
    explanation: { type: String },
    image_url: { type: String },
  },
  {
    // Preserve _id on each embedded question — critical for highlight stability
    _id: true,
  }
)

const QuizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true },
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
  },
  { timestamps: true }
)

// Optimized indexes for Explore/Search
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

QuizSchema.pre('validate', function () {
  if (typeof this.course_code === 'string') {
    this.course_code = this.course_code.trim().toUpperCase()
  }
})

// Synchronization Hook: Keep questionCount up to date
QuizSchema.pre('save', function () {
  if (this.questions && this.questions.length > 0) {
    this.questionCount = this.questions.length
  }
})

export const Quiz = mongoose.models.Quiz ?? mongoose.model<IQuiz>('Quiz', QuizSchema)
