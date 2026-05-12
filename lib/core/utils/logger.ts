import pino from 'pino'

// pino-pretty is not compatible with Next.js webpack bundler (worker thread issue).
// Use plain JSON logging in all environments — readable enough in dev terminal.
// Redact sensitive fields using pino's build-in redaction
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['password', 'password_hash', 'token', 'reset_token', 'cookie', 'email', 'body.password', 'body.email', 'headers.cookie', 'headers.authorization'],
    censor: '[REDACTED]',
  },
  formatters: {
    level(label) {
      return { level: label }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})

export default logger

export interface SecurityEventContext {
  request_id: string
  user_id?: string
  route: string
  outcome: 'success' | 'failure' | 'denied' | 'error'
  ip?: string
  [key: string]: any
}

// Helper to mask email for PII redaction
export const maskEmail = (email: string) => {
  if (!email || !email.includes('@')) return email
  const [user, domain] = email.split('@')
  return `${user.charAt(0)}***@${domain}`
}

// Helper to mask IP for PII redaction
export const maskIP = (ip: string) => {
  if (!ip) return ip
  return ip.replace(/\d+\.\d+$/, 'x.x')
}

export const logSecurityEvent = (event: string, ctx: SecurityEventContext, message: string) => {
  const { ip, ...rest } = ctx
  logger.info(
    {
      event,
      ...rest,
      ip: ip ? maskIP(ip) : undefined,
    },
    message
  )
}

export const logDBConnectionTimeout = (err?: unknown) =>
  logger.error({ event: 'db_connection_timeout', err }, 'MongoDB connection timeout')

export const logRateLimitTriggered = (ctx: SecurityEventContext) =>
  logSecurityEvent('rate_limit_triggered', ctx, 'Rate limit triggered')

export const logJWTVerificationFailed = (ctx: SecurityEventContext, reason?: string) =>
  logSecurityEvent('jwt_verification_failed', { ...ctx, reason }, 'JWT verification failed')

export const logSessionError = (sessionId: string, ctx: SecurityEventContext, err?: unknown) =>
  logger.error({ event: 'session_error', sessionId, ...ctx, err }, 'Session error')
