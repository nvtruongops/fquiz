import mongoose from 'mongoose'
import { setTimeout as delay } from 'node:timers/promises'
import { connectDB } from '@/lib/core/db/mongodb'
import { syncUniqueStudentCount } from '@/lib/modules/quiz/quiz-engine'
import {
  processNextQuizStatsJob,
  QUIZ_STATS_QUEUE_COLLECTION,
  type QuizStatsJobCollection,
} from '@/lib/modules/quiz/quiz-stats-queue'

let stopping = false
process.once('SIGINT', () => { stopping = true })
process.once('SIGTERM', () => { stopping = true })

async function runWorker() {
  await connectDB()
  const rawCollection = mongoose.connection.collection(QUIZ_STATS_QUEUE_COLLECTION)
  await rawCollection.createIndex({ availableAt: 1, leaseUntil: 1 })

  const workerId = `${process.env.HOSTNAME ?? 'quiz-stats'}:${process.pid}`
  const collection = rawCollection as unknown as QuizStatsJobCollection

  console.info(`[quiz-stats-worker] Started ${workerId}`)
  while (!stopping) {
    try {
      const processed = await processNextQuizStatsJob(
        collection,
        syncUniqueStudentCount,
        workerId,
        new Date(),
        (job, error, retryAt) => console.error('[quiz-stats-worker] Sync failed; retry scheduled', {
          quizId: String(job._id),
          error,
          retryAt: retryAt.toISOString(),
        })
      )
      if (!processed) await delay(500)
    } catch (error) {
      console.error('[quiz-stats-worker] Queue poll failed', error)
      await delay(1_000)
    }
  }

  await mongoose.disconnect()
}

runWorker().catch((error) => {
  console.error('[quiz-stats-worker] Fatal startup error', error)
  process.exit(1)
})
