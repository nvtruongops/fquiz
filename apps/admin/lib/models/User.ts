import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  username: string
  username_lower: string
  email: string
  password_hash: string
  avatar_url?: string | null
  profile_bio?: string | null
  role: 'admin' | 'teacher' | 'student' | 'dev'
  status: 'active' | 'banned' | 'pending_deletion'
  ban_reason?: string | null
  sharing_violations: number
  timezone: string
  language: 'vi' | 'en'
  theme_preference: 'light' | 'dark' | 'green' | 'pink'
  notify_email: boolean
  notify_quiz_reminder: boolean
  privacy_share_activity: boolean
  created_at: Date
  reset_token?: string | null
  reset_token_expires?: Date | null
  reset_token_attempts?: number
  token_version: number
  google_id?: string | null
  pinned_categories?: string[]
  pinned_quizzes?: string[]
  deletion_requested_at?: Date | null
  deletion_scheduled_for?: Date | null
  deletion_token?: string | null
  deletion_token_expires?: Date | null
}

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
    theme_preference: { type: String, enum: ['light', 'dark', 'green', 'pink'], required: true, default: 'light' },
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
    pinned_quizzes: { type: [String], default: [] },
    deletion_requested_at: { type: Date, default: null },
    deletion_scheduled_for: { type: Date, default: null },
    deletion_token: { type: String, default: null },
    deletion_token_expires: { type: Date, default: null },
  },
  { timestamps: false }
)

export const User = (mongoose.models.User as mongoose.Model<IUser>) ?? mongoose.model<IUser>('User', UserSchema)
