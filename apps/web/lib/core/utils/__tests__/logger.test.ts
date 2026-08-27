/**
 * Tests for logger utility functions.
 * Note: jest.setup.ts globally mocks this module with a modified default export.
 * The utility functions (maskEmail, maskIP, etc.) are preserved from the real module.
 * We mock pino to prevent real logging.
 */
jest.mock('pino', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
  const pinoMock = jest.fn(() => mockLogger) as any
  pinoMock.stdTimeFunctions = { isoTime: jest.fn(() => Date.now().toString()) }
  return pinoMock
})

import logger from '../logger'
import { maskEmail, maskIP, logDBConnectionTimeout, logRateLimitTriggered, logJWTVerificationFailed, logSessionError } from '../logger'

describe('PII Masking', () => {
  describe('maskEmail', () => {
    it('should mask user portion and preserve domain', () => {
      expect(maskEmail('john.doe@example.com')).toBe('j***@example.com')
    })

    it('should handle invalid email formats', () => {
      expect(maskEmail('')).toBe('')
      expect(maskEmail('notanemail')).toBe('notanemail')
    })
  })

  describe('maskIP', () => {
    it('should mask last two octets of IPv4', () => {
      expect(maskIP('192.168.1.100')).toBe('192.168.x.x')
    })

    it('should handle invalid formats', () => {
      expect(maskIP('')).toBe('')
      expect(maskIP('invalid')).toBe('invalid')
    })
  })
})

describe('Security Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('logRateLimitTriggered should log event', () => {
    const ctx = { request_id: 'req-789', route: '/api/login', outcome: 'denied' as const }
    logRateLimitTriggered(ctx)
    expect(logger.info).toHaveBeenCalled()
  })

  it('logJWTVerificationFailed should log event', () => {
    const ctx = { request_id: 'req-101', route: '/api/auth', outcome: 'failure' as const }
    logJWTVerificationFailed(ctx, 'Token expired')
    expect(logger.info).toHaveBeenCalled()
  })

  it('logSessionError should log', () => {
    const ctx = { request_id: 'req-202', route: '/api/sessions', outcome: 'error' as const }
    logSessionError('session-123', ctx, new Error('err'))
    expect(logger.error).toHaveBeenCalled()
  })
})

describe('DB Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('logDBConnectionTimeout should log', () => {
    logDBConnectionTimeout(new Error('timeout'))
    expect(logger.error).toHaveBeenCalled()
  })
})

