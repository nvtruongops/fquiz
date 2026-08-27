import { Types } from 'mongoose'

export type UserRole = 'admin' | 'teacher' | 'student' | 'dev'
export type UserStatus = 'active' | 'banned' | 'pending_deletion'
export type UserTheme = 'light' | 'dark' | 'green' | 'pink'

export interface IUser {
  _id: Types.ObjectId
  username: string
  username_lower: string
  email: string
  password_hash: string
  avatar_url?: string | null
  profile_bio?: string | null
  role: UserRole
  status: UserStatus
  ban_reason?: string
  sharing_violations: number
  timezone?: string
  language?: 'vi' | 'en'
  themePreference?: UserTheme
  theme_preference?: UserTheme
  notify_email?: boolean
  notify_quiz_reminder?: boolean
  privacy_share_activity?: boolean
  created_at: Date
  reset_token?: string
  reset_token_expires?: Date
  reset_token_attempts?: number
  token_version?: number
  google_id?: string | null
  pinned_categories?: string[]
  pinned_quizzes?: string[]
  deletion_requested_at?: Date | null
  deletion_scheduled_for?: Date | null
  deletion_token?: string | null
  deletion_token_expires?: Date | null
}
