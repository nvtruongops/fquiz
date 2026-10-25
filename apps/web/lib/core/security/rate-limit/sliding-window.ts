import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  createRateLimitErrorResponse as buildRateLimitErrorResponse,
  getClientIp,
  RATE_LIMIT_TIERS,
  type RateLimitConfig,
  type RateLimitStatus,
} from '@fquiz/auth'
import logger from '@/lib/core/utils/logger'

export { checkRateLimit, getClientIp, RATE_LIMIT_TIERS, type RateLimitConfig, type RateLimitStatus }

/**
 * Helper to construct 429 Too Many Requests response with standard headers
 */
export function createRateLimitErrorResponse(status: RateLimitStatus): NextResponse {
  logger.warn(
    {
      limit: status.limit,
      remaining: status.remaining,
      reset: status.reset,
    },
    'Rate limit exceeded - blocking request'
  )

  return buildRateLimitErrorResponse(status, 'Too many requests. Please try again later.')
}
