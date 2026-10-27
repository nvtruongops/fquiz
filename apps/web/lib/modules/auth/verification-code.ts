import crypto from 'node:crypto'

export function generateVerificationCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashVerificationCode(code: string): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is required to hash verification codes')
  return crypto
    .createHmac('sha256', secret)
    .update(code)
    .digest('hex')
}

export function isValidVerificationCode(code: string): boolean {
  return /^[0-9]{6}$/.test(code)
}
