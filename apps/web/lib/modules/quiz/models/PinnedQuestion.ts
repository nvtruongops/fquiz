import mongoose, { Schema } from 'mongoose'

export interface IPinnedQuestion {
  _id?: any
  student_id: mongoose.Types.ObjectId
  question_id?: string
  quiz_id?: mongoose.Types.ObjectId
  quiz_title?: string
  course_code: string
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string
  created_at?: Date
}

const PinnedQuestionSchema = new Schema<IPinnedQuestion>(
  {
    student_id: { type: Schema.Types.ObjectId, required: true, index: true },
    question_id: { type: String, default: '' },
    quiz_id: { type: Schema.Types.ObjectId },
    quiz_title: { type: String, default: '' },
    course_code: { type: String, required: true, index: true },
    text: { type: String, required: true },
    options: { type: [String], required: true },
    correct_answer: { type: [Number], required: true },
    explanation: { type: String, default: '' },
    image_url: { type: String, default: '' },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
)

// Index for fast lookup by student and course_code
PinnedQuestionSchema.index({ student_id: 1, course_code: 1 })
PinnedQuestionSchema.index({ student_id: 1, text: 1, course_code: 1 }, { unique: true })

export const PinnedQuestion =
  mongoose.models.PinnedQuestion ||
  mongoose.model<IPinnedQuestion>('PinnedQuestion', PinnedQuestionSchema)
