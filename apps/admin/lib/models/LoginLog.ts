import mongoose, { Schema, Document } from 'mongoose'

export interface ILoginLog extends Document {
  _id: mongoose.Types.ObjectId
  user_id: mongoose.Types.ObjectId
  ip: string
  user_agent: string
  created_at: Date
}

const LoginLogSchema = new Schema<ILoginLog>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ip: { type: String, default: 'unknown' },
    user_agent: { type: String, default: 'unknown' },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
)

export const LoginLog =
  (mongoose.models.LoginLog as mongoose.Model<ILoginLog>) ??
  mongoose.model<ILoginLog>('LoginLog', LoginLogSchema)
