import mongoose, { Schema } from 'mongoose'
import type { IUser } from '@/lib/modules/auth/types/user'

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
    username_lower: { type: String, required: true, unique: true, lowercase: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    avatar_url: { type: String, default: null },
    profile_bio: { type: String, default: null },
    role: { type: String, enum: ['admin', 'teacher', 'student', 'dev'], required: true, default: 'student' },
    status: { type: String, enum: ['active', 'banned', 'pending_deletion'], required: true, default: 'active' },
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
    reset_token_attempts: { type: Number, default: 0 },
    token_version: { type: Number, required: true, default: 1 },
    google_id: { type: String, default: null, sparse: true },
    pinned_categories: { type: [String], default: [] },
    deletion_requested_at: { type: Date, default: null },
    deletion_scheduled_for: { type: Date, default: null },
    deletion_token: { type: String, default: null },
    deletion_token_expires: { type: Date, default: null },
  },
  { timestamps: false }
)

const existingUserModel = mongoose.models.User
if (existingUserModel && (!existingUserModel.schema.path('token_version') || !existingUserModel.schema.path('pinned_categories') || !existingUserModel.schema.path('deletion_token'))) {
  delete mongoose.models.User
}

export const User = mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema)
