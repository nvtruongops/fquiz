import { safeCompare, getCsrfTokenFromCookie, withCsrfHeaders, validateCsrfRequest, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../csrf'

describe('safeCompare', () => {
  it('should return true for equal strings', () => {
    expect(safeCompare('abc', 'abc')).toBe(true)
    expect(safeCompare('', '')).toBe(true)
  })
  it('should return false for different strings', () => {
    expect(safeCompare('abc', 'abd')).toBe(false)
    expect(safeCompare('abc', 'ab')).toBe(false)
  })
  it('should return false for non-string inputs', () => {
    expect(safeCompare(null, 'abc')).toBe(false)
    expect(safeCompare('abc', undefined)).toBe(false)
    expect(safeCompare(123 as any, 'abc')).toBe(false)
  })
  it('should handle strings of different lengths', () => {
    expect(safeCompare('abc', 'abcd')).toBe(false)
  })
  it('should be constant-time (return for equal)', () => {
    // Test that comparison works for identical long strings
    const s = 'x'.repeat(1000)
    expect(safeCompare(s, s)).toBe(true)
  })
})

describe('validateCsrfRequest', () => {
  it('should allow GET requests', () => {
    const req = new Request('http://localhost/test', { method: 'GET' })
    expect(validateCsrfRequest(req)).toBe(true)
  })
  it('should allow HEAD requests', () => {
    const req = new Request('http://localhost/test', { method: 'HEAD' })
    expect(validateCsrfRequest(req)).toBe(true)
  })
  it('should allow OPTIONS requests', () => {
    const req = new Request('http://localhost/test', { method: 'OPTIONS' })
    expect(validateCsrfRequest(req)).toBe(true)
  })
  it('should reject POST without CSRF tokens', () => {
    const req = new Request('http://localhost/test', { method: 'POST' })
    expect(validateCsrfRequest(req)).toBe(false)
  })
  it('should reject POST with mismatched CSRF tokens', () => {
    const req = new Request('http://localhost/test', {
      method: 'POST',
      headers: {
        'cookie': `${CSRF_COOKIE_NAME}=token1`,
        [CSRF_HEADER_NAME]: 'token2',
      },
    })
    expect(validateCsrfRequest(req)).toBe(false)
  })
  it('should accept POST with matching CSRF tokens', () => {
    const req = new Request('http://localhost/test', {
      method: 'POST',
      headers: {
        'cookie': `${CSRF_COOKIE_NAME}=valid-token`,
        [CSRF_HEADER_NAME]: 'valid-token',
        'host': 'localhost',
      },
    })
    expect(validateCsrfRequest(req)).toBe(true)
  })
  it('should reject POST with invalid origin', () => {
    const req = new Request('http://localhost/test', {
      method: 'POST',
      headers: {
        'cookie': `${CSRF_COOKIE_NAME}=token`,
        [CSRF_HEADER_NAME]: 'token',
        'origin': 'https://evil.com',
        'host': 'localhost',
      },
    })
    expect(validateCsrfRequest(req)).toBe(false)
  })
  it('should reject POST with invalid referer', () => {
    const req = new Request('http://localhost/test', {
      method: 'POST',
      headers: {
        'cookie': `${CSRF_COOKIE_NAME}=token`,
        [CSRF_HEADER_NAME]: 'token',
        'referer': 'https://evil.com',
        'host': 'localhost',
      },
    })
    expect(validateCsrfRequest(req)).toBe(false)
  })
  it('should accept POST with valid origin', () => {
    const req = new Request('http://localhost/test', {
      method: 'POST',
      headers: {
        'cookie': `${CSRF_COOKIE_NAME}=token`,
        [CSRF_HEADER_NAME]: 'token',
        'origin': 'http://localhost',
        'host': 'localhost',
      },
    })
    expect(validateCsrfRequest(req)).toBe(true)
  })
})
