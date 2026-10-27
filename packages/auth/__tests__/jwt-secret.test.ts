import { signToken, decrypt } from '../src/jwt'

describe('JWT secret configuration', () => {
  const originalSecret = process.env.JWT_SECRET

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = originalSecret
  })

  it('requires JWT_SECRET before signing', async () => {
    delete process.env.JWT_SECRET
    await expect(signToken('user-123', 'student')).rejects.toThrow('JWT_SECRET is required')
  })

  it('signs and verifies using JWT_SECRET', async () => {
    process.env.JWT_SECRET = 'test-only-jwt-secret'
    const token = await signToken('user-123', 'student')
    await expect(decrypt(token)).resolves.toMatchObject({ userId: 'user-123', role: 'student' })
  })
})
