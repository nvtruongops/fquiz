import mongoose, { Schema } from 'mongoose'
import type { IUser } from '@/types/user'

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 15,
      match: /^\w+$/,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    avatar_url: { type: String, default: null },
    profile_bio: { type: String, default: null },
    role: { type: String, enum: ['admin', 'student'], required: true, default: 'student' },
    status: { type: String, enum: ['active', 'banned'], required: true, default: 'active' },
    ban_reason: { type: String, default: null },
    sharing_violations: { type: Number, required: true, default: 0 },
    timezone: { type: String, required: true, default: 'Asia/Ho_Chi_Minh' },
    language: { type: String, enum: ['vi', 'en'], required: true, default: 'vi' },
    notify_email: { type: Boolean, required: true, default: true },
    notify_quiz_reminder: { type: Boolean, required: true, default: true },
    privacy_share_activity: { type: Boolean, required: true, default: true },
    created_at: { type: Date, default: Date.now },
    reset_token: { type: String, default: null },
    reset_token_expires: { type: Date, default: null },
    token_version: { type: Number, required: true, default: 1 },
    pinned_categories: { type: [String], default: [] },
  },
  { timestamps: false }
)

const existingUserModel = mongoose.models.User
if (existingUserModel && !existingUserModel.schema.path('token_version')) {
  delete mongoose.models.User
}

export const User = mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema)
