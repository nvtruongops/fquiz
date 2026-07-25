import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/core/utils/logger'

export interface RateLimitConfig {
  limit: number
  windowMs: number
  keyPrefix?: string
}

export interface RateLimitStatus {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// In-Memory Sliding Window Counter Store
class MemorySlidingWindowStore {
  private store = new Map<string, { currentCount: number; previousCount: number; windowStart: number }>()

  check(key: string, limit: number, windowMs: number): RateLimitStatus {
    const now = Date.now()
    const currentWindowStart = Math.floor(now / windowMs) * windowMs
    const elapsedInWindow = now - currentWindowStart
    const entry = this.store.get(key)

    if (!entry || entry.windowStart < currentWindowStart - windowMs) {
      // Bucket expired, reset
      this.store.set(key, {
        currentCount: 1,
        previousCount: 0,
        windowStart: currentWindowStart,
      })
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: currentWindowStart + windowMs,
      }
    }

    if (entry.windowStart < currentWindowStart) {
      // Transition to new window
      entry.previousCount = entry.currentCount
      entry.currentCount = 1
      entry.windowStart = currentWindowStart
    } else {
      entry.currentCount += 1
    }

    // Sliding window formula: previousCount * (1 - elapsed / windowMs) + currentCount
    const weight = (windowMs - elapsedInWindow) / windowMs
    const estimatedCount = Math.floor(entry.previousCount * weight + entry.currentCount)

    const success = estimatedCount <= limit
    const remaining = Math.max(0, limit - estimatedCount)
    const reset = currentWindowStart + windowMs

    return { success, limit, remaining, reset }
  }

  // Periodic cleanup of stale keys (every 5 minutes)
  cleanup(windowMs: number) {
    const cutoff = Date.now() - windowMs * 2
    for (const [key, entry] of this.store.entries()) {
      if (entry.windowStart < cutoff) {
        this.store.delete(key)
      }
    }
  }
}

const memoryStore = new MemorySlidingWindowStore()

// Periodically clean up memory store every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => memoryStore.cleanup(60 * 1000), 5 * 60 * 1000)
}

/**
 * Extract trustworthy client IP address behind proxies like Vercel/Cloudflare
 */
export function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map((ip) => ip.trim())
    return ips[0] || '127.0.0.1'
  }
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    '127.0.0.1'
  )
}

/**
 * Tiered Rate Limiter Strategy for FQuiz Routes
 */
export const RATE_LIMIT_TIERS = {
  // 1. Critical Auth & Password Endpoints (Strict: 5 req/min)
  AUTH_STRICT: { limit: 5, windowMs: 60 * 1000, keyPrefix: 'rl:auth_strict' },

  // 2. Heavy AI & Export Generation (10 req/min)
  AI_GENERATE: { limit: 10, windowMs: 60 * 1000, keyPrefix: 'rl:ai_gen' },

  // 3. Search & Question Bank Analytics (20 req/min)
  SEARCH_HEAVY: { limit: 20, windowMs: 60 * 1000, keyPrefix: 'rl:search' },

  // 4. Standard Quiz Session Mutations (60 req/min)
  MUTATION_STANDARD: { limit: 60, windowMs: 60 * 1000, keyPrefix: 'rl:mut' },

  // 5. General Public API Read (100 req/min for Guest, 300 req/min for Auth)
  PUBLIC_READ_GUEST: { limit: 100, windowMs: 60 * 1000, keyPrefix: 'rl:read_guest' },
  PUBLIC_READ_AUTH: { limit: 300, windowMs: 60 * 1000, keyPrefix: 'rl:read_auth' },
}

/**
 * Evaluate rate limit for a specific request and tier
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): RateLimitStatus {
  const ip = getClientIp(request)
  const authToken = request.cookies.get('auth-token')?.value
  const userIdentifier = authToken ? `user:${authToken.slice(0, 16)}` : `ip:${ip}`
  const key = `${config.keyPrefix || 'rl'}:${userIdentifier}`

  return memoryStore.check(key, config.limit, config.windowMs)
}

/**
 * Helper to construct 429 Too Many Requests response with standard headers
 */
export function createRateLimitErrorResponse(status: RateLimitStatus): NextResponse {
  const retryAfterSeconds = Math.ceil((status.reset - Date.now()) / 1000)

  logger.warn(
    {
      limit: status.limit,
      remaining: status.remaining,
      reset: status.reset,
    },
    'Rate limit exceeded - blocking request'
  )

  return new NextResponse(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau giây lát.',
      statusCode: 429,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(1, retryAfterSeconds)),
        'X-RateLimit-Limit': String(status.limit),
        'X-RateLimit-Remaining': String(status.remaining),
        'X-RateLimit-Reset': String(Math.ceil(status.reset / 1000)),
      },
    }
  )
}
