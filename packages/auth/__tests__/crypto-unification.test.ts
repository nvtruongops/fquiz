import crypto from 'crypto'
import {
  encryptSecret,
  decryptSecret,
  maskApiKey,
  isEncryptedSecret,
  hashPassword,
  verifyPassword,
  generateSecureToken,
} from '../src/crypto'

function encryptWithSecret(plainText: string, secret: string): string {
  const iv = crypto.randomBytes(12)
  const key = crypto.scryptSync(secret, 'fquiz-salt', 32)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(plainText, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

describe('@fquiz/auth crypto unification', () => {
  const originalEncryptionKey = process.env.ENCRYPTION_KEY
  const originalPreviousEncryptionKey = process.env.ENCRYPTION_KEY_PREV
  const originalJwtSecret = process.env.JWT_SECRET

  afterEach(() => {
    if (originalEncryptionKey === undefined) {
      delete process.env.ENCRYPTION_KEY
    } else {
      process.env.ENCRYPTION_KEY = originalEncryptionKey
    }
    if (originalPreviousEncryptionKey === undefined) {
      delete process.env.ENCRYPTION_KEY_PREV
    } else {
      process.env.ENCRYPTION_KEY_PREV = originalPreviousEncryptionKey
    }
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET
    } else {
      process.env.JWT_SECRET = originalJwtSecret
    }
  })

  it('encrypts with ENCRYPTION_KEY priority and decrypts round-trip', () => {
    process.env.ENCRYPTION_KEY = 'primary-encryption-key-test'
    process.env.JWT_SECRET = 'secondary-jwt-secret-test'

    const secret = 'AIzaSyTestGeminiKey1234567890'
    const cipherText = encryptSecret(secret)

    expect(isEncryptedSecret(cipherText)).toBe(true)
    expect(cipherText).not.toContain(secret)
    expect(decryptSecret(cipherText)).toBe(secret)
  })

  it('seamlessly decrypts secrets encrypted under JWT_SECRET even when ENCRYPTION_KEY is set', () => {
    process.env.ENCRYPTION_KEY = 'new-encryption-key-2026'
    process.env.JWT_SECRET = 'legacy-test-jwt-secret'

    const plain = 'AIzaSyLegacyWebEncryptedKey9988'
    const legacyWebCipher = encryptWithSecret(plain, 'legacy-test-jwt-secret')

    expect(decryptSecret(legacyWebCipher)).toBe(plain)
  })

  it('decrypts secrets encrypted with the previous configured encryption key', () => {
    process.env.ENCRYPTION_KEY = 'custom-prod-key'
    const previousKey = 'previous-encryption-key-test'
    const olderKey = 'older-encryption-key-test'
    process.env.ENCRYPTION_KEY_PREV = `${previousKey},${olderKey}`
    process.env.JWT_SECRET = 'custom-jwt-key'

    const previousCipher = encryptWithSecret('AIzaSyPreviousKey1234', olderKey)

    expect(decryptSecret(previousCipher)).toBe('AIzaSyPreviousKey1234')
  })

  it('masks API keys accurately for both encrypted and plain inputs', () => {
    process.env.ENCRYPTION_KEY = 'mask-test-key'
    const cipher = encryptSecret('AIzaSyMaskTestKeyAbCd')
    expect(maskApiKey(cipher)).toBe('••••••••AbCd')
    expect(maskApiKey('short')).toBe('••••••••')
    expect(maskApiKey('')).toBe('')
  })

  it('preserves hashPassword, verifyPassword, and generateSecureToken exports', async () => {
    const hash = await hashPassword('Pass123!')
    expect(await verifyPassword('Pass123!', hash)).toBe(true)
    expect(await verifyPassword('Wrong!', hash)).toBe(false)
    expect(generateSecureToken(16)).toHaveLength(32)
  })
})
