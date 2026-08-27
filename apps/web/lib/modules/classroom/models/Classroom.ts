import mongoose, { Schema } from 'mongoose'
import type { IClassroom } from '@/lib/modules/classroom/types/classroom'

const ClassroomSchema = new Schema<IClassroom>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    password: { type: String, default: null, trim: true },
    description: { type: String, default: '', maxlength: 1000 },
    teacher_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cover_image: { type: String, default: null },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    student_count: { type: Number, default: 0 },
    settings: {
      allow_code_join: { type: Boolean, default: true },
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

ClassroomSchema.index({ teacher_id: 1, status: 1 })

if (process.env.NODE_ENV === 'development' && mongoose.models.Classroom) {
  delete mongoose.models.Classroom
}

export const Classroom = mongoose.models.Classroom ?? mongoose.model<IClassroom>('Classroom', ClassroomSchema)
