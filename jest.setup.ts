/**
 * Jest setup file - runs before all tests
 * Mocks external dependencies and sets up test environment
 */

// Mock logger to prevent "logSecurityEvent is not a function" errors
jest.mock('./lib/logger', () => ({
  logSecurityEvent: jest.fn(),
  logRateLimitTriggered: jest.fn(),
  logJWTVerificationFailed: jest.fn(),
  logSessionError: jest.fn(),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'
process.env.MONGODB_URI = 'mongodb://localhost:27017/fquiz-test'
;(process.env as Record<string, string>)['NODE_ENV'] = 'test'
