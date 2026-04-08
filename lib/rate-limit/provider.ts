/**
 * Rate Limiting Provider
 * Uses MongoDB as the shared production store (Vercel + MongoDB only).
 */
import logger from '@/lib/logger'
import { connectDB } from '@/lib/mongodb'

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export interface RateLimitProvider {
  check(identifier: string): Promise<RateLimitResult>
}

class MemoryRateLimitProvider implements RateLimitProvider {
  private readonly store = new Map<string, { count: number; expires: number }>()
  private readonly interval = 60 * 1000 // 1 minute
  private readonly limit = 5

  async check(identifier: string): Promise<RateLimitResult> {
    const now = Date.now()
    const entry = this.store.get(identifier)

    if (!entry || now > entry.expires) {
      const newEntry = { count: 1, expires: now + this.interval }
      this.store.set(identifier, newEntry)
      return { success: true, limit: this.limit, remaining: this.limit - 1, reset: newEntry.expires }
    }

    if (entry.count >= this.limit) {
      return { success: false, limit: this.limit, remaining: 0, reset: entry.expires }
    }

    entry.count += 1
    return { success: true, limit: this.limit, remaining: this.limit - entry.count, reset: entry.expires }
  }
}

/**
 * MongoDB-backed limiter using fixed time buckets.
 * Bucket key pattern: `${identifier}:${windowStartMs}`
 *
 * This avoids extra infrastructure and still provides shared limits
 * across serverless instances.
 */
class MongoRateLimitProvider implements RateLimitProvider {
  private readonly fallback: RateLimitProvider
  private readonly limit = 5
  private readonly windowMs = 60 * 1000
  private indexesReady = false

  constructor(fallback: RateLimitProvider) {
    this.fallback = fallback
  }

  async check(identifier: string): Promise<RateLimitResult> {
    const now = Date.now()
    const bucketStart = Math.floor(now / this.windowMs) * this.windowMs
    const bucketEnd = bucketStart + this.windowMs
    const bucketKey = `${identifier}:${bucketStart}`

    try {
      const mongoose = await connectDB()
      const collection = mongoose.connection.collection('rate_limits')

      if (!this.indexesReady) {
        await Promise.all([
          collection.createIndex({ bucketKey: 1 }, { unique: true }),
          collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        ])
        this.indexesReady = true
      }

      await collection.updateOne(
        { bucketKey },
        {
          $inc: { count: 1 },
          $setOnInsert: {
            bucketKey,
            createdAt: new Date(now),
            // Keep one extra window so TTL cleanup can happen asynchronously.
            expiresAt: new Date(bucketEnd + this.windowMs),
          },
        },
        { upsert: true }
      )

      const current = await collection.findOne(
        { bucketKey },
        { projection: { count: 1 } }
      )

      const count = Number(current?.count ?? 1)

      return {
        success: count <= this.limit,
        limit: this.limit,
        remaining: Math.max(0, this.limit - count),
        reset: bucketEnd,
      }
    } catch (err) {
      logger.error(
        { err, identifier },
        'MongoDB rate limiter degraded mode: falling back to in-memory limiter'
      )
      return this.fallback.check(identifier)
    }
  }
}

class ProviderFactory {
  private memoryProvider: RateLimitProvider | null = null

  getMemoryProvider() {
    this.memoryProvider ??= new MemoryRateLimitProvider()
    return this.memoryProvider
  }

  getProvider(): RateLimitProvider {
    return new MongoRateLimitProvider(this.getMemoryProvider())
  }
}

export const providerFactory = new ProviderFactory()
export const rateLimiter = providerFactory.getProvider()
