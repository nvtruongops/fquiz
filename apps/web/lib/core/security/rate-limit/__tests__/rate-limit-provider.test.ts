import { getClientIp } from '@fquiz/auth'
import { providerFactory } from '../provider'

describe('Rate Limit Provider Test Suite', () => {
  const memoryLimiter = providerFactory.getMemoryProvider()

  test('allows requests within limit and decrements remaining count', async () => {
    const id = 'ip-test-1'
    const r1 = await memoryLimiter.check(id)
    expect(r1.success).toBe(true)
    expect(r1.limit).toBe(5)
    expect(r1.remaining).toBe(4)

    const r2 = await memoryLimiter.check(id)
    expect(r2.success).toBe(true)
    expect(r2.remaining).toBe(3)
  })

  test('blocks requests exceeding limit', async () => {
    const id = 'ip-test-exceed'

    // Consume all 5 allowed requests
    for (let i = 0; i < 5; i++) {
      await memoryLimiter.check(id)
    }

    // 6th request should fail
    const blocked = await memoryLimiter.check(id)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  test('providerFactory exposes in-memory provider singleton', () => {
    const provider = providerFactory.getMemoryProvider()
    expect(provider).toBeDefined()
    expect(typeof provider.check).toBe('function')
  })

  test('getClientIp prioritizes cf-connecting-ip over spoofed x-forwarded-for', () => {
    const reqWithCf = new Request('https://web.example.test/api/auth/login', {
      headers: {
        'x-forwarded-for': '1.2.3.4, 203.0.113.50',
        'cf-connecting-ip': '203.0.113.50',
      },
    })
    expect(getClientIp(reqWithCf)).toBe('203.0.113.50')

    const reqWithXffOnly = new Request('https://web.example.test/api/auth/login', {
      headers: {
        'x-forwarded-for': '1.2.3.4, 198.51.100.99',
      },
    })
    expect(getClientIp(reqWithXffOnly)).toBe('198.51.100.99')
  })
})
