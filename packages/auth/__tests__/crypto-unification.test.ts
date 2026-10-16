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
  const originalJwtSecret = process.env.JWT_SECRET

  afterEach(() => {
    if (originalEncryptionKey === undefined) {
      delete process.env.ENCRYPTION_KEY
    } else {
      process.env.ENCRYPTION_KEY = originalEncryptionKey
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
    process.env.JWT_SECRET = 'REMOVED_LEGACY_SECRET'

    const plain = 'AIzaSyLegacyWebEncryptedKey9988'
    const legacyWebCipher = encryptWithSecret(plain, 'REMOVED_LEGACY_SECRET')

    expect(decryptSecret(legacyWebCipher)).toBe(plain)
  })

  it('seamlessly decrypts secrets encrypted under legacy fallback keys', () => {
    process.env.ENCRYPTION_KEY = 'custom-prod-key'
    process.env.JWT_SECRET = 'custom-jwt-key'

    const webFallbackCipher = encryptWithSecret(
      'AIzaSyWebFallbackKey1111',
      'REMOVED_LEGACY_SECRET'
    )
    const adminFallbackCipher = encryptWithSecret(
      'AIzaSyAdminFallbackKey2222',
      'REMOVED_LEGACY_SECRET'
    )

    expect(decryptSecret(webFallbackCipher)).toBe('AIzaSyWebFallbackKey1111')
    expect(decryptSecret(adminFallbackCipher)).toBe('AIzaSyAdminFallbackKey2222')
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
