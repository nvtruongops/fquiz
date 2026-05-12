/**
 * Global System Constants
 */

export const AUTH_COOKIE_NAME = 'auth-token'
export const CSRF_COOKIE_NAME = 'csrf-token'
export const MAINTENANCE_COOKIE_NAME = 'maintenance-mode'

export const JWT_EXPIRY = '24h'
export const COOKIE_MAX_AGE = 60 * 60 * 24 // 24 hours

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const PAGINATION_DEFAULT_LIMIT = 20
export const PAGINATION_MAX_LIMIT = 100

export const CACHE_TTL_SHORT = 60 // 1 minute
export const CACHE_TTL_MEDIUM = 60 * 5 // 5 minutes
export const CACHE_TTL_LONG = 60 * 60 // 1 hour
