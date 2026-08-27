import mongoose, { Schema } from 'mongoose'

export interface IMigrationLog {
  _id: mongoose.Types.ObjectId
  migration_id: string
  migration_name: string
  started_at: Date
  finished_at?: Date
  dry_run: boolean
  rollback: boolean
  status: 'running' | 'completed' | 'failed' | 'rolled_back'
  total_quizzes: number
  total_questions: number
  created: number
  reused: number
  failed: number
  skipped: number
  invalid_questions: number
  quiz_ids_processed: mongoose.Types.ObjectId[]
  errors: Array<{ quiz_id: string; error: string }>
  duration_ms?: number
}

const MigrationLogSchema = new Schema<IMigrationLog>(
  {
    migration_id: { type: String, required: true, unique: true },
    migration_name: { type: String, required: true },
    started_at: { type: Date, required: true, default: Date.now },
    finished_at: { type: Date },
    dry_run: { type: Boolean, default: false },
    rollback: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'rolled_back'],
      default: 'running',
    },
    total_quizzes: { type: Number, default: 0 },
    total_questions: { type: Number, default: 0 },
    created: { type: Number, default: 0 },
    reused: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    invalid_questions: { type: Number, default: 0 },
    quiz_ids_processed: [{ type: Schema.Types.ObjectId }],
    errors: [
      {
        quiz_id: { type: String },
        error: { type: String },
      },
    ],
    duration_ms: { type: Number },
  },
  { timestamps: false, suppressReservedKeysWarning: true }
)

MigrationLogSchema.index({ migration_name: 1, started_at: -1 })
MigrationLogSchema.index({ status: 1 })

export const MigrationLog =
  mongoose.models.MigrationLog ??
  mongoose.model<IMigrationLog>('MigrationLog', MigrationLogSchema)
