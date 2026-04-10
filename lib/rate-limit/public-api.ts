/**
 * Rate Limiting for Public API endpoints
 * More lenient limits for guest users browsing/searching
 */
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { connectDB } from '@/lib/mongodb'

export interface PublicRateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Get client identifier from request
 * Uses IP address for guests, user ID for authenticated users
 */
function getClientIdentifier(request: NextRequest): string {
  // Check if user is authenticated (has auth token)
  const authToken = request.cookies.get('auth-token')?.value
  if (authToken) {
    // For authenticated users, use a different (higher) limit
    return `auth:${authToken.slice(0, 16)}`
  }

  // For guests, use IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  return `guest:${ip}`
}

/**
 * MongoDB-backed rate limiter for public API
 * - Guests: 30 requests per minute
 * - Authenticated: 100 requests per minute
 */
class PublicApiRateLimiter {
  private readonly guestLimit = 30
  private readonly authLimit = 100
  private readonly windowMs = 60 * 1000 // 1 minute
  private indexesReady = false

  async check(request: NextRequest): Promise<PublicRateLimitResult> {
    const identifier = getClientIdentifier(request)
    const isAuth = identifier.startsWith('auth:')
    const limit = isAuth ? this.authLimit : this.guestLimit

    const now = Date.now()
    const bucketStart = Math.floor(now / this.windowMs) * this.windowMs
    const bucketEnd = bucketStart + this.windowMs
    const bucketKey = `public_api:${identifier}:${bucketStart}`

    try {
      const mongoose = await connectDB()
      
      // Check if connection is ready
      if (!mongoose.connection || mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB connection not ready')
      }
      
      const collection = mongoose.connection.collection('rate_limits')

      if (!this.indexesReady) {
        try {
          await Promise.all([
            collection.createIndex({ bucketKey: 1 }, { unique: true }),
            collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
          ])
          this.indexesReady = true
        } catch (indexErr) {
          // Index creation might fail if already exists, continue anyway
          logger.warn({ err: indexErr }, 'Rate limit index creation warning')
        }
      }

      await collection.updateOne(
        { bucketKey },
        {
          $inc: { count: 1 },
          $setOnInsert: {
            bucketKey,
            identifier,
            createdAt: new Date(now),
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
        success: count <= limit,
        limit,
        remaining: Math.max(0, limit - count),
        reset: bucketEnd,
      }
    } catch (err) {
      logger.error(
        { 
          err, 
          identifier,
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          errorType: err instanceof Error ? err.constructor.name : typeof err
        },
        'Public API rate limiter error - allowing request'
      )
      // On error, allow the request (fail open)
      return {
        success: true,
        limit,
        remaining: limit,
        reset: bucketEnd,
      }
    }
  }
}

const limiter = new PublicApiRateLimiter()

/**
 * Rate limit middleware for public API endpoints
 * Returns 429 if limit exceeded
 */
export async function checkPublicApiRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  try {
    const result = await limiter.check(request)

    // Add rate limit headers
    const headers = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toString(),
    }

    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
      
      logger.warn(
        { 
          identifier: getClientIdentifier(request),
          path: request.nextUrl.pathname,
          remaining: result.remaining,
          reset: new Date(result.reset).toISOString()
        },
        'Public API rate limit exceeded'
      )

      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter,
          limit: result.limit,
          reset: result.reset
        },
        { 
          status: 429,
          headers: {
            ...headers,
            'Retry-After': retryAfter.toString(),
          }
        }
      )
    }

    // Return null to indicate request should proceed
    return null
  } catch (error) {
    // On error, log and allow the request (fail open for availability)
    logger.error(
      { 
        err: error,
        path: request.nextUrl.pathname 
      },
      'Rate limiter error - allowing request'
    )
    return null
  }
}

/**
 * Apply rate limit headers to a response
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  result: PublicRateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())
  return response
}
