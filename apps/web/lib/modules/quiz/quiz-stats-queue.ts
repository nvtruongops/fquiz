import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'

export const QUIZ_STATS_QUEUE_COLLECTION = 'quiz_stats_jobs'
const QUIZ_STATS_JOB_LEASE_MS = 120_000

export interface QuizStatsJob {
  _id: unknown
  generation: number
  attempts: number
  workerId?: string
}

type MongoRecord = Record<string, unknown>

export interface QuizStatsJobCollection {
  updateOne(
    filter: MongoRecord,
    update: MongoRecord,
    options?: MongoRecord
  ): Promise<{ modifiedCount?: number }>
  findOneAndUpdate(
    filter: MongoRecord,
    update: MongoRecord,
    options: MongoRecord
  ): Promise<unknown>
  deleteOne(filter: MongoRecord): Promise<{ deletedCount?: number }>
}

function asObjectId(quizId: unknown): mongoose.Types.ObjectId {
  if (quizId instanceof mongoose.Types.ObjectId) return quizId
  if (typeof quizId === 'string' && mongoose.Types.ObjectId.isValid(quizId)) {
    return new mongoose.Types.ObjectId(quizId)
  }
  throw new Error('Quiz stats queue requires a valid quiz ID')
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000
}

export async function enqueueQuizStatsJob(
  collection: QuizStatsJobCollection,
  quizId: unknown,
  now = new Date(),
  delayMs = 0
): Promise<void> {
  const id = asObjectId(quizId)
  const availableAt = new Date(now.getTime() + Math.max(0, delayMs))
  const update = {
    $inc: { generation: 1 },
    $set: { availableAt, updatedAt: now, attempts: 0, lastError: null },
    $setOnInsert: { createdAt: now },
  }

  try {
    await collection.updateOne({ _id: id }, update, { upsert: true })
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error
    await collection.updateOne({ _id: id }, update)
  }
}

export async function enqueueUniqueStudentCountSync(quizId: unknown, delayMs = 0): Promise<void> {
  const db = await connectDB()
  const collection = db.connection.collection(QUIZ_STATS_QUEUE_COLLECTION) as unknown as QuizStatsJobCollection
  await enqueueQuizStatsJob(collection, quizId, new Date(), delayMs)
}

export function getQuizStatsRetryDelayMs(attempt: number): number {
  const exponent = Math.max(0, Math.min(8, Math.floor(attempt) - 1))
  return Math.min(300_000, 1_000 * (2 ** exponent))
}

function unwrapJob(result: unknown): QuizStatsJob | null {
  if (!result || typeof result !== 'object') return null
  const candidate = 'value' in result ? result.value : result
  if (!candidate || typeof candidate !== 'object' || !('_id' in candidate) || !('generation' in candidate)) {
    return null
  }
  const job = candidate as QuizStatsJob
  return typeof job.generation === 'number' ? job : null
}

export async function processNextQuizStatsJob(
  collection: QuizStatsJobCollection,
  syncUniqueStudentCount: (quizId: unknown) => Promise<void>,
  workerId: string,
  now = new Date(),
  onFailure?: (job: QuizStatsJob, error: unknown, retryAt: Date) => void
): Promise<boolean> {
  const job = unwrapJob(await collection.findOneAndUpdate(
    {
      availableAt: { $lte: now },
      $or: [
        { leaseUntil: { $exists: false } },
        { leaseUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        workerId,
        leaseUntil: new Date(now.getTime() + QUIZ_STATS_JOB_LEASE_MS),
        updatedAt: now,
      },
    },
    { sort: { availableAt: 1 }, returnDocument: 'after' }
  ))

  if (!job) return false

  try {
    await syncUniqueStudentCount(job._id)
    const completion = await collection.deleteOne({ _id: job._id, workerId, generation: job.generation })
    if (completion.deletedCount === 0) {
      await collection.updateOne(
        { _id: job._id, workerId, generation: { $ne: job.generation } },
        { $unset: { leaseUntil: '', workerId: '' }, $set: { updatedAt: new Date() } }
      )
    }
  } catch (error) {
    const retryAt = new Date(now.getTime() + getQuizStatsRetryDelayMs(job.attempts + 1))
    onFailure?.(job, error, retryAt)
    await collection.updateOne(
      { _id: job._id, workerId, generation: job.generation },
      {
        $inc: { attempts: 1 },
        $set: {
          availableAt: retryAt,
          updatedAt: now,
          lastError: error instanceof Error ? error.message.slice(0, 500) : 'Unknown stats sync error',
        },
        $unset: { leaseUntil: '', workerId: '' },
      }
    )
    await collection.updateOne(
      { _id: job._id, workerId, generation: { $ne: job.generation } },
      { $unset: { leaseUntil: '', workerId: '' }, $set: { updatedAt: new Date() } }
    )
  }

  return true
}
