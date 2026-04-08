import fc from 'fast-check'
import { LoginSchema, RegisterSchema } from '../schemas'

describe('P12: Password validation rejects short passwords', () => {
  it('LoginSchema rejects empty password', () => {
    const result = LoginSchema.safeParse({ identifier: 'test@example.com', password: '' })
    expect(result.success).toBe(false)
  })

  it('RegisterSchema rejects any password shorter than 8 characters', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 7 }), (shortPassword) => {
        const result = RegisterSchema.safeParse({
          username: 'testuser',
          email: 'test@example.com',
          password: shortPassword,
          confirmPassword: shortPassword,
        })
        return result.success === false
      }),
      { numRuns: 100 }
    )
  })

  it('RegisterSchema rejects mismatched confirmPassword', () => {
    const result = RegisterSchema.safeParse({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'different123',
    })
    expect(result.success).toBe(false)
  })
})
