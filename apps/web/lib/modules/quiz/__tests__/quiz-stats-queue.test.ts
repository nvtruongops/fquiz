import mongoose from 'mongoose'
import {
  enqueueQuizStatsJob,
  getQuizStatsRetryDelayMs,
  processNextQuizStatsJob,
  type QuizStatsJobCollection,
} from '../quiz-stats-queue'

function createCollection(overrides: Partial<QuizStatsJobCollection> = {}) {
  return {
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    findOneAndUpdate: jest.fn().mockResolvedValue(null),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    ...overrides,
  } as QuizStatsJobCollection & {
    updateOne: jest.Mock
    findOneAndUpdate: jest.Mock
    deleteOne: jest.Mock
  }
}

describe('quiz stats durable queue', () => {
  const quizId = new mongoose.Types.ObjectId('6a95ab568ed76bd375c5bf18')
  const now = new Date('2026-10-31T10:00:00.000Z')

  test('coalesces stats updates into one durable job per quiz', async () => {
    const collection = createCollection()

    await enqueueQuizStatsJob(collection, quizId, now)

    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: quizId },
      expect.objectContaining({
        $inc: { generation: 1 },
        $set: expect.objectContaining({ availableAt: now, updatedAt: now, attempts: 0 }),
      }),
      { upsert: true }
    )
  })

  test('recovers a concurrent first-enqueue duplicate key race', async () => {
    const duplicateKey = Object.assign(new Error('duplicate key'), { code: 11000 })
    const collection = createCollection({
      updateOne: jest.fn().mockRejectedValueOnce(duplicateKey).mockResolvedValueOnce({ modifiedCount: 1 }),
    })

    await enqueueQuizStatsJob(collection, quizId, now)

    expect(collection.updateOne).toHaveBeenCalledTimes(2)
    expect(collection.updateOne.mock.calls[1][2]).toBeUndefined()
  })

  test('processes the claimed generation and deletes the completed job', async () => {
    const job = { _id: quizId, generation: 3, attempts: 0, workerId: 'worker-a' }
    const collection = createCollection({
      findOneAndUpdate: jest.fn().mockResolvedValue(job),
    })
    const sync = jest.fn().mockResolvedValue(undefined)

    await expect(processNextQuizStatsJob(collection, sync, 'worker-a', now)).resolves.toBe(true)

    expect(sync).toHaveBeenCalledWith(quizId)
    expect(collection.deleteOne).toHaveBeenCalledWith({ _id: quizId, workerId: 'worker-a', generation: 3 })
  })

  test('keeps a newer enqueue available when it arrives during aggregation', async () => {
    const job = { _id: quizId, generation: 3, attempts: 0, workerId: 'worker-a' }
    const collection = createCollection({
      findOneAndUpdate: jest.fn().mockResolvedValue(job),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    })
    const sync = jest.fn().mockResolvedValue(undefined)

    await processNextQuizStatsJob(collection, sync, 'worker-a', now)

    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: quizId, workerId: 'worker-a', generation: { $ne: 3 } },
      expect.objectContaining({ $unset: { leaseUntil: '', workerId: '' } })
    )
  })

  test('does not run an aggregation when no job is due', async () => {
    const collection = createCollection()
    const sync = jest.fn()

    await expect(processNextQuizStatsJob(collection, sync, 'worker-a', now)).resolves.toBe(false)

    expect(sync).not.toHaveBeenCalled()
    expect(collection.deleteOne).not.toHaveBeenCalled()
  })

  test('stores failed work with bounded exponential retry delay', async () => {
    const job = { _id: quizId, generation: 3, attempts: 2, workerId: 'worker-a' }
    const collection = createCollection({
      findOneAndUpdate: jest.fn().mockResolvedValue(job),
    })
    const sync = jest.fn().mockRejectedValue(new Error('temporary database error'))

    await expect(processNextQuizStatsJob(collection, sync, 'worker-a', now)).resolves.toBe(true)

    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: quizId, workerId: 'worker-a', generation: 3 },
      expect.objectContaining({
        $inc: { attempts: 1 },
        $set: expect.objectContaining({ availableAt: new Date(now.getTime() + 4000) }),
        $unset: { leaseUntil: '', workerId: '' },
      })
    )
    expect(getQuizStatsRetryDelayMs(999)).toBeLessThanOrEqual(300_000)
  })
})
