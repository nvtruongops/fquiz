import { hashVerificationCode } from '../verification-code'

describe('hashVerificationCode', () => {
  const originalSecret = process.env.JWT_SECRET

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = originalSecret
  })

  it('requires JWT_SECRET', () => {
    delete process.env.JWT_SECRET
    expect(() => hashVerificationCode('123456')).toThrow('JWT_SECRET is required')
  })

  it('hashes codes with the configured JWT_SECRET', () => {
    process.env.JWT_SECRET = 'test-only-jwt-secret'
    expect(hashVerificationCode('123456')).toBe(hashVerificationCode('123456'))
  })
})
