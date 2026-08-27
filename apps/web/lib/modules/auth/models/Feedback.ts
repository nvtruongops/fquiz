import mongoose, { Schema } from 'mongoose'

export interface IFeedback {
  _id: mongoose.Types.ObjectId
  user_id: mongoose.Types.ObjectId
  username: string
  user_email: string
  type: 'bug' | 'feature' | 'content' | 'other'
  message: string
  status: 'pending' | 'reviewed' | 'resolved'
  reply_message?: string
  replied_at?: Date
  created_at: Date
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    user_email: { type: String, required: true, default: '' },
    type: { type: String, enum: ['bug', 'feature', 'content', 'other'], required: true },
    message: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
    reply_message: { type: String, maxlength: 2000 },
    replied_at: { type: Date },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

FeedbackSchema.index({ status: 1, created_at: -1 })
FeedbackSchema.index({ user_id: 1, created_at: -1 })

export const Feedback =
  mongoose.models.Feedback ?? mongoose.model<IFeedback>('Feedback', FeedbackSchema)
