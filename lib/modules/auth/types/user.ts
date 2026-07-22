import { Types } from 'mongoose'

export interface IUser {
  _id: Types.ObjectId
  username: string
  username_lower: string
  email: string
  password_hash: string
  avatar_url?: string | null
  profile_bio?: string | null
  role: 'admin' | 'teacher' | 'student' | 'dev'
  status: 'active' | 'banned' | 'pending_deletion'
  ban_reason?: string
  sharing_violations: number
  timezone?: string
  language?: 'vi' | 'en'
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
  deletion_requested_at?: Date | null
  deletion_scheduled_for?: Date | null
  deletion_token?: string | null
  deletion_token_expires?: Date | null
}
