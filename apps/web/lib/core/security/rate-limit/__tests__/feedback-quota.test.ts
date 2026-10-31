jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn() }))

import { connectDB } from '@/lib/core/db/mongodb'
import { consumeFeedbackQuota } from '../feedback-quota'

describe('consumeFeedbackQuota', () => {
  const collection = {
    createIndex: jest.fn().mockResolvedValue(undefined),
    findOneAndUpdate: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(connectDB as jest.Mock).mockResolvedValue({ connection: { collection: () => collection } })
  })

  it('uses a rolling one-hour predicate and the existing three-feedback cap', async () => {
    collection.findOneAndUpdate.mockResolvedValue({ value: { _id: 'quota-1' } })
    const now = new Date('2026-10-30T12:00:00.000Z')

    await expect(consumeFeedbackQuota('dummy-user', now)).resolves.toBe(true)

    const [filter, update] = collection.findOneAndUpdate.mock.calls[0]
    expect(filter.userId).toBe('dummy-user')
    expect(filter.$expr.$lt[1]).toBe(3)
    expect(filter.$expr.$lt[0].$size.$filter.cond.$gt[1]).toEqual(new Date('2026-10-30T11:00:00.000Z'))
    expect(update[0].$set.timestamps.$concatArrays[1]).toEqual([now])
  })

  it('lets the conditional database update arbitrate concurrent submissions', async () => {
    collection.findOneAndUpdate
      .mockResolvedValueOnce({ value: { _id: 'accepted' } })
      .mockResolvedValueOnce(null)
    const now = new Date('2026-10-30T12:00:00.000Z')

    const results = await Promise.all([
      consumeFeedbackQuota('dummy-user', now),
      consumeFeedbackQuota('dummy-user', now),
    ])

    expect(results.sort()).toEqual([false, true])
    expect(collection.findOneAndUpdate).toHaveBeenCalledTimes(2)
    expect(collection.findOneAndUpdate.mock.calls[0][0]).toEqual(collection.findOneAndUpdate.mock.calls[1][0])
  })

  it('retries duplicate first-insert races without upsert', async () => {
    collection.findOneAndUpdate
      .mockRejectedValueOnce({ code: 11000 })
      .mockResolvedValueOnce(null)

    await expect(consumeFeedbackQuota('dummy-user', new Date())).resolves.toBe(false)
    expect(collection.findOneAndUpdate.mock.calls[0][2].upsert).toBe(true)
    expect(collection.findOneAndUpdate.mock.calls[1][2].upsert).toBe(false)
  })

  it('propagates quota store failures instead of using a local fallback', async () => {
    collection.findOneAndUpdate.mockRejectedValue(new Error('quota store unavailable'))

    await expect(consumeFeedbackQuota('dummy-user', new Date())).rejects.toThrow('quota store unavailable')
  })
})
