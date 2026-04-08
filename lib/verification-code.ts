import crypto from 'node:crypto'

export function generateVerificationCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashVerificationCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

export function isValidVerificationCode(code: string): boolean {
  return /^[0-9]{6}$/.test(code)
}
