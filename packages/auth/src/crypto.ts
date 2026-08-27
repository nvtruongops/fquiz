import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const ENCRYPTION_SECRET = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'fquiz-llm-secret-encryption-key-2026-sin1'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function encryptSecret(plainText: string): string {
  if (!plainText || typeof plainText !== 'string') return ''
  const trimmed = plainText.trim()
  if (!trimmed) return ''

  if (isEncryptedSecret(trimmed)) return trimmed

  const iv = crypto.randomBytes(12)
  const key = crypto.scryptSync(ENCRYPTION_SECRET, 'fquiz-salt', 32)
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

  try {
    const parts = trimmed.split(':')
    if (parts.length !== 3) return trimmed

    const [ivHex, authTagHex, encryptedHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const key = crypto.scryptSync(ENCRYPTION_SECRET, 'fquiz-salt', 32)

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return trimmed
  }
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
