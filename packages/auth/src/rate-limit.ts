import { NextRequest, NextResponse } from 'next/server'

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

class MemorySlidingWindowStore {
  private store = new Map<string, { currentCount: number; previousCount: number; windowStart: number }>()

  check(key: string, limit: number, windowMs: number): RateLimitStatus {
    const now = Date.now()
    const currentWindowStart = Math.floor(now / windowMs) * windowMs
    const elapsedInWindow = now - currentWindowStart
    const entry = this.store.get(key)

    if (!entry || entry.windowStart < currentWindowStart - windowMs) {
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
      entry.previousCount = entry.currentCount
      entry.currentCount = 1
      entry.windowStart = currentWindowStart
    } else {
      entry.currentCount += 1
    }

    const weight = (windowMs - elapsedInWindow) / windowMs
    const estimatedCount = Math.floor(entry.previousCount * weight + entry.currentCount)

    const success = estimatedCount <= limit
    const remaining = Math.max(0, limit - estimatedCount)
    const reset = currentWindowStart + windowMs

    return { success, limit, remaining, reset }
  }

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

if (typeof setInterval !== 'undefined') {
  setInterval(() => memoryStore.cleanup(60 * 1000), 5 * 60 * 1000)
}

export function getClientIp(request: Request | NextRequest): string {
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

export const RATE_LIMIT_TIERS = {
  AUTH_STRICT: { limit: 5, windowMs: 60 * 1000, keyPrefix: 'rl:auth_strict' },
  AI_GENERATE: { limit: 10, windowMs: 60 * 1000, keyPrefix: 'rl:ai_gen' },
  SEARCH_HEAVY: { limit: 20, windowMs: 60 * 1000, keyPrefix: 'rl:search' },
  MUTATION_STANDARD: { limit: 60, windowMs: 60 * 1000, keyPrefix: 'rl:mut' },
  QUIZ_SESSION: { limit: 180, windowMs: 60 * 1000, keyPrefix: 'rl:quiz_sess' },
  PUBLIC_READ_GUEST: { limit: 100, windowMs: 60 * 1000, keyPrefix: 'rl:read_guest' },
  PUBLIC_READ_AUTH: { limit: 300, windowMs: 60 * 1000, keyPrefix: 'rl:read_auth' },
}

export function checkRateLimit(
  request: Request | NextRequest,
  config: RateLimitConfig
): RateLimitStatus {
  const ip = getClientIp(request)
  const cookieHeader = request.headers.get('cookie') || ''
  const authTokenFromCookie = cookieHeader
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
  const authToken = authTokenFromCookie ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const userIdentifier = authToken ? `user:${authToken.slice(-24)}` : `ip:${ip}`
  const key = `${config.keyPrefix || 'rl'}:${userIdentifier}`

  return memoryStore.check(key, config.limit, config.windowMs)
}

export function createRateLimitErrorResponse(status: RateLimitStatus): NextResponse {
  const retryAfterSeconds = Math.ceil((status.reset - Date.now()) / 1000)

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
