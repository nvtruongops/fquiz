import mongoose, { Schema } from 'mongoose'
import type { IClassroomMember } from '../entities/classroom.types'

const ClassroomMemberSchema = new Schema<IClassroomMember>(
  {
    classroom_id: { type: Schema.Types.ObjectId, ref: 'Classroom', required: true, index: true },
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    joined_at: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    is_pinned: { type: Boolean, default: false },
    is_starred: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
  },
  { timestamps: false }
)

ClassroomMemberSchema.index({ classroom_id: 1, student_id: 1 }, { unique: true })
ClassroomMemberSchema.index({ student_id: 1, status: 1 })

export const ClassroomMember =
  mongoose.models.ClassroomMember ?? mongoose.model<IClassroomMember>('ClassroomMember', ClassroomMemberSchema)
