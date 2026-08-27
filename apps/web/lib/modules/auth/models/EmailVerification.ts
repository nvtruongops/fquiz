import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const EmailVerificationSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, enum: ['register', 'reset-password'], required: true },
    code_hash: { type: String, required: true },
    expires_at: { type: Date, required: true },
    resend_available_at: { type: Date, required: true },
    attempts: { type: Number, required: true, default: 0 },
    used: { type: Boolean, required: true, default: false },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
)

EmailVerificationSchema.index({ email: 1, purpose: 1 }, { unique: true })
EmailVerificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 })

export type EmailVerificationDoc = InferSchemaType<typeof EmailVerificationSchema>

export const EmailVerification =
  mongoose.models.EmailVerification ??
  mongoose.model('EmailVerification', EmailVerificationSchema)
