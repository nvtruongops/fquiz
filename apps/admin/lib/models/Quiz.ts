import mongoose, { Schema, Document } from 'mongoose'

export interface IQuestion {
  _id?: mongoose.Types.ObjectId | string
  question_id?: string
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string
}

export interface IQuiz extends Document {
  _id: mongoose.Types.ObjectId
  title: string
  description?: string
  category_id: mongoose.Types.ObjectId
  course_code: string
  questions?: IQuestion[]
  question_refs?: mongoose.Types.ObjectId[]
  questionCount: number
  studentCount: number
  author_id?: mongoose.Types.ObjectId
  created_by?: mongoose.Types.ObjectId
  visibility: 'private' | 'class' | 'public'
  status: 'draft' | 'pending' | 'published' | 'archived' | 'deleted'
  is_public: boolean
  is_saved_from_explore?: boolean
  is_temp?: boolean
  created_at: Date
  updated_at: Date
}

const QuestionSchema = new Schema<IQuestion>(
  {
    question_id: { type: String, required: false },
    text: { type: String, required: true },
    options: { type: [String], required: true },
    correct_answer: { type: [Number], required: true },
    explanation: { type: String },
    image_url: { type: String },
  },
  { _id: true }
)

const QuizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    course_code: { type: String, required: true },
    questions: { type: [QuestionSchema], required: false, default: [] },
    question_refs: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    questionCount: { type: Number, default: 0 },
    studentCount: { type: Number, default: 0 },
    author_id: { type: Schema.Types.ObjectId, ref: 'User' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    visibility: { type: String, enum: ['private', 'class', 'public'], default: 'public' },
    status: { type: String, enum: ['draft', 'pending', 'published', 'archived', 'deleted'], default: 'published' },
    is_public: { type: Boolean, default: true },
    is_saved_from_explore: { type: Boolean, default: false },
    is_temp: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

QuizSchema.index({ category_id: 1, status: 1 })
QuizSchema.index({ course_code: 1, status: 1 })
QuizSchema.index({ author_id: 1, status: 1 })

export const Quiz =
  (mongoose.models.Quiz as mongoose.Model<IQuiz>) ??
  mongoose.model<IQuiz>('Quiz', QuizSchema)
