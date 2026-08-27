import mongoose, { Schema } from 'mongoose'
import type { IQuizSession, UserAnswer, FlashcardStats } from '../entities/session.types'
import type { IQuestion } from '../entities/quiz.types'

const UserAnswerSchema = new Schema<UserAnswer>(
  {
    question_index: { type: Number, required: true },
    answer_index: { type: Number, required: true },
    answer_indexes: { type: [Number], required: false, default: undefined },
    is_correct: { type: Boolean, required: true },
  },
  { _id: false }
)

const FlashcardStatsSchema = new Schema<FlashcardStats>(
  {
    total_cards: { type: Number, required: true, default: 0 },
    cards_known: { type: Number, required: true, default: 0 },
    cards_unknown: { type: Number, required: true, default: 0 },
    time_spent_ms: { type: Number, required: true, default: 0 },
    current_round: { type: Number, required: true, default: 1 },
  },
  { _id: false }
)

const QuestionCacheSchema = new Schema<IQuestion>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    text: { type: String, required: true },
    options: { type: [String], required: true },
    correct_answer: { type: [Number], required: true },
    explanation: { type: String, required: false },
    image_url: { type: String, required: false },
  },
  { _id: false }
)

const QuizSessionSchema = new Schema<IQuizSession>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: false, default: null },
    is_guest: { type: Boolean, default: false },
    guest_id: { type: String, required: false },
    quiz_id: { type: Schema.Types.ObjectId, ref: 'Quiz', required: false },
    mode: { type: String, enum: ['immediate', 'review', 'flashcard'], required: true },
    difficulty: { type: String, enum: ['sequential', 'random'], required: true, default: 'sequential' },
    status: {
      type: String,
      enum: ['preparing', 'active', 'completed', 'paused', 'expired'],
      default: 'preparing',
    },
    user_answers: { type: [UserAnswerSchema], default: [] },
    current_question_index: { type: Number, required: true, default: 0 },
    question_order: { type: [Number], required: true, default: [] },
    question_ids: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    questions_cache: { type: [QuestionCacheSchema], required: false },
    score: { type: Number, required: true, default: 0 },
    flashcard_stats: { type: FlashcardStatsSchema, required: false },
    expires_at: { type: Date, required: false },
    started_at: { type: Date, required: true, default: Date.now },
    completed_at: { type: Date },
    last_activity_at: { type: Date, default: Date.now },
    paused_at: { type: Date },
    total_paused_duration_ms: { type: Number, default: 0 },
    is_temp: { type: Boolean, default: false },
    answer_version: { type: Number, default: 1 },
    assignment_id: { type: Schema.Types.ObjectId, ref: 'QuizAssignment', default: null },
    classroom_id: { type: Schema.Types.ObjectId, ref: 'Classroom', default: null },
  },
  { timestamps: false }
)

QuizSessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 })
QuizSessionSchema.index(
  { started_at: 1 },
  { 
    expireAfterSeconds: 604800,
    partialFilterExpression: { status: { $in: ['preparing', 'active', 'paused'] } }
  }
)
QuizSessionSchema.index({ student_id: 1, quiz_id: 1 })
QuizSessionSchema.index({ student_id: 1, is_temp: 1, expires_at: 1 })
QuizSessionSchema.index({ student_id: 1, status: 1, completed_at: -1 })
QuizSessionSchema.index({ is_guest: 1, guest_id: 1 }, { sparse: true })

export const QuizSession = mongoose.models.QuizSession ?? mongoose.model<IQuizSession>('QuizSession', QuizSessionSchema)
