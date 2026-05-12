import { Types } from 'mongoose'

export interface IUser {
  _id: Types.ObjectId
  username: string
  email: string
  password_hash: string
  avatar_url?: string | null
  profile_bio?: string | null
  role: 'admin' | 'student'
  status: 'active' | 'banned'
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
  token_version?: number
  pinned_categories?: string[]
}
