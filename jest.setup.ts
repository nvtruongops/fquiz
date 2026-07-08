/**
 * Jest setup file - runs before all tests
 * Mocks external dependencies and sets up test environment
 */

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'
process.env.MONGODB_URI = 'mongodb://localhost:27017/fquiz-test'
;(process.env as Record<string, string>)['NODE_ENV'] = 'test'
