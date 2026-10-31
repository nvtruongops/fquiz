import { connectDB } from '@/lib/core/db/mongodb'

const FEEDBACK_LIMIT = 3
const FEEDBACK_WINDOW_MS = 60 * 60 * 1000

let indexesPromise: Promise<unknown> | null = null

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000
}

/** Atomically consume one slot in a rolling one-hour feedback quota. */
export async function consumeFeedbackQuota(userId: string, now = new Date()): Promise<boolean> {
  const mongoose = await connectDB()
  const collection = mongoose.connection.collection('feedback_rate_limits')
  indexesPromise ??= Promise.all([
    collection.createIndex({ userId: 1 }, { unique: true }),
    collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]).catch((error) => {
    indexesPromise = null
    throw error
  })
  await indexesPromise

  const windowStart = new Date(now.getTime() - FEEDBACK_WINDOW_MS)
  const recentTimestamps = {
    $filter: {
      input: { $ifNull: ['$timestamps', []] },
      as: 'timestamp',
      cond: { $gt: ['$$timestamp', windowStart] },
    },
  }
  const filter = {
    userId,
    $expr: { $lt: [{ $size: recentTimestamps }, FEEDBACK_LIMIT] },
  }
  const update = [{
    $set: {
      userId,
      timestamps: { $concatArrays: [recentTimestamps, [now]] },
      expiresAt: new Date(now.getTime() + FEEDBACK_WINDOW_MS),
    },
  }]

  const readUpdatedDocument = async (upsert: boolean) => {
    const result = await collection.findOneAndUpdate(filter, update, {
      upsert,
      returnDocument: 'after',
      projection: { _id: 1 },
    })
    return result && 'value' in result ? result.value : result
  }

  try {
    return Boolean(await readUpdatedDocument(true))
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error
    // Concurrent first requests can race to create the unique user row. Retry
    // without upsert so the same rolling-window predicate arbitrates capacity.
    return Boolean(await readUpdatedDocument(false))
  }
}
