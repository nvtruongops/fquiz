import { Types } from 'mongoose'

export interface ILoginLog {
  _id: Types.ObjectId
  user_id: Types.ObjectId
  ip: string
  user_agent: string
  logged_at: Date
}
