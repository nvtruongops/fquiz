import mongoose, { Schema } from 'mongoose'
import type { IUserHighlight } from '@/types/highlight'

const UserHighlightSchema = new Schema<IUserHighlight>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    question_id: { type: Schema.Types.ObjectId, required: true },
    text_segment: { type: String, required: true },
    color_code: {
      type: String,
      enum: ['#B0D4B8', '#D7F9FA', '#FFE082', '#EF9A9A'],
      required: true,
    },
    offset: { type: Number, required: true, min: 0 },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

// Compound index for efficient per-student per-question queries
UserHighlightSchema.index({ student_id: 1, question_id: 1 })

export const UserHighlight =
  mongoose.models.UserHighlight ??
  mongoose.model<IUserHighlight>('UserHighlight', UserHighlightSchema)
