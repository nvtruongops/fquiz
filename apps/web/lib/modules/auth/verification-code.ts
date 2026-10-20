import crypto from 'node:crypto'

export function generateVerificationCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashVerificationCode(code: string): string {
  const secret = process.env.JWT_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required to hash verification codes in production')
  }
  return crypto
    .createHmac('sha256', secret || 'REMOVED_LEGACY_SECRET')
    .update(code)
    .digest('hex')
}

export function isValidVerificationCode(code: string): boolean {
  return /^[0-9]{6}$/.test(code)
}
