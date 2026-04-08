import fc from 'fast-check'
import { RegisterSchema } from '../schemas'

const safeEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{2,9}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{1,8}$/),
    fc.constantFrom('com', 'net', 'org', 'io', 'edu')
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

const safeUsername = fc.stringMatching(/^[a-zA-Z0-9_]{3,20}$/)

// Generate passwords that match PASSWORD_REGEX: at least 8 chars, 1 uppercase, 1 lowercase, 1 digit
const safePassword = fc
  .tuple(
    fc.stringMatching(/[A-Z]/), // At least 1 uppercase
    fc.stringMatching(/[a-z]/), // At least 1 lowercase
    fc.stringMatching(/[0-9]/), // At least 1 digit
    fc.string({ minLength: 5, maxLength: 50 }) // Additional chars to reach min 8
  )
  .map(([upper, lower, digit, rest]) => {
    // Shuffle to avoid predictable patterns
    const chars = (upper + lower + digit + rest).split('')
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }
    return chars.join('')
  })

describe('P1: Registration accepts any valid input', () => {
  it('RegisterSchema accepts valid username, email and matching password >= 8 chars', () => {
    fc.assert(
      fc.property(
        safeUsername,
        safeEmail,
        safePassword,
        (username, email, password) => {
          const result = RegisterSchema.safeParse({ username, email, password, confirmPassword: password })
          return result.success === true
        }
      ),
      { numRuns: 100 }
    )
  })
})
