import crypto from 'crypto'
import bcrypt from 'bcryptjs'

function getPrimarySecret(): string {
  return (
    process.env.ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'fquiz-llm-secret-encryption-key-2026-sin1'
  )
}

function getCandidateSecrets(): string[] {
  const candidates = [
    process.env.ENCRYPTION_KEY,
    process.env.JWT_SECRET,
    'fquiz-llm-secret-encryption-key-2026-sin1',
    'fquiz-admin-encryption-key-2026',
  ].filter((s): s is string => Boolean(s && s.trim()))
  return Array.from(new Set(candidates))
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export const verifyPassword = comparePassword

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

export function encryptSecret(plainText: string): string {
  if (!plainText || typeof plainText !== 'string') return ''
  const trimmed = plainText.trim()
  if (!trimmed) return ''

  if (isEncryptedSecret(trimmed)) return trimmed

  const iv = crypto.randomBytes(12)
  const key = crypto.scryptSync(getPrimarySecret(), 'fquiz-salt', 32)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(trimmed, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

export function decryptSecret(cipherText: string): string {
  if (!cipherText || typeof cipherText !== 'string') return ''
  const trimmed = cipherText.trim()
  if (!trimmed) return ''

  if (!isEncryptedSecret(trimmed)) {
    return trimmed
  }

  const parts = trimmed.split(':')
  if (parts.length !== 3) return trimmed

  const [ivHex, authTagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  for (const secret of getCandidateSecrets()) {
    try {
      const key = crypto.scryptSync(secret, 'fquiz-salt', 32)
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch {
      // Try next candidate secret
    }
  }

  return trimmed
}

export function maskApiKey(cipherOrPlainText: string): string {
  if (!cipherOrPlainText) return ''
  const plainText = decryptSecret(cipherOrPlainText)
  if (!plainText) return ''
  if (plainText.length <= 8) return '••••••••'
  return `••••••••${plainText.slice(-4)}`
}

export function isEncryptedSecret(str: string): boolean {
  if (!str || typeof str !== 'string') return false
  const parts = str.split(':')
  if (parts.length !== 3) return false
  return parts.every((p) => /^[a-f0-9]+$/i.test(p))
}

