import {
  EMAIL_REGEX,
  URL_REGEX,
  USERNAME_REGEX,
  PASSWORD_REGEX,
  stripHtml,
} from '../common'

describe('Regex Patterns', () => {
  describe('EMAIL_REGEX', () => {
    it('should match valid email addresses', () => {
      expect(EMAIL_REGEX.test('user@example.com')).toBe(true)
      expect(EMAIL_REGEX.test('user.name+tag@example.co.uk')).toBe(true)
      expect(EMAIL_REGEX.test('user_name@domain.org')).toBe(true)
      expect(EMAIL_REGEX.test('user%name@domain.net')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(EMAIL_REGEX.test('')).toBe(false)
      expect(EMAIL_REGEX.test('notanemail')).toBe(false)
      expect(EMAIL_REGEX.test('@domain.com')).toBe(false)
      expect(EMAIL_REGEX.test('user@')).toBe(false)
      expect(EMAIL_REGEX.test('user@.com')).toBe(false)
      expect(EMAIL_REGEX.test('user name@domain.com')).toBe(false)
    })
  })

  describe('URL_REGEX', () => {
    it('should match valid URLs', () => {
      expect(URL_REGEX.test('http://example.com')).toBe(true)
      expect(URL_REGEX.test('https://example.com')).toBe(true)
      expect(URL_REGEX.test('https://www.example.com/path')).toBe(true)
      expect(URL_REGEX.test('https://example.com/path?q=1&r=2')).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(URL_REGEX.test('')).toBe(false)
      expect(URL_REGEX.test('not-a-url')).toBe(false)
      expect(URL_REGEX.test('ftp://example.com')).toBe(false)
      expect(URL_REGEX.test('http://')).toBe(false)
    })
  })

  describe('USERNAME_REGEX', () => {
    it('should match valid usernames', () => {
      expect(USERNAME_REGEX.test('john_doe')).toBe(true)
      expect(USERNAME_REGEX.test('abc')).toBe(true)
      expect(USERNAME_REGEX.test('user123')).toBe(true)
      expect(USERNAME_REGEX.test('a_b_c_d_e_f')).toBe(true)
    })

    it('should reject invalid usernames', () => {
      expect(USERNAME_REGEX.test('ab')).toBe(false)
      expect(USERNAME_REGEX.test('a@b')).toBe(false)
      expect(USERNAME_REGEX.test('user name')).toBe(false)
      expect(USERNAME_REGEX.test('a'.repeat(31))).toBe(false)
      expect(USERNAME_REGEX.test('')).toBe(false)
    })
  })

  describe('PASSWORD_REGEX', () => {
    it('should match valid passwords', () => {
      expect(PASSWORD_REGEX.test('Password1')).toBe(true)
      expect(PASSWORD_REGEX.test('MyPass123')).toBe(true)
      expect(PASSWORD_REGEX.test('Abcdefg1')).toBe(true)
      expect(PASSWORD_REGEX.test('A1b2C3d4E5f6')).toBe(true)
    })

    it('should reject invalid passwords', () => {
      expect(PASSWORD_REGEX.test('short1A')).toBe(false)
      expect(PASSWORD_REGEX.test('nouppercase1')).toBe(false)
      expect(PASSWORD_REGEX.test('NOLOWERCASE1')).toBe(false)
      expect(PASSWORD_REGEX.test('NoDigitHere')).toBe(false)
      expect(PASSWORD_REGEX.test('')).toBe(false)
    })
  })
})

describe('stripHtml', () => {
  it('should remove basic HTML tags', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello')
    expect(stripHtml('<div>Content</div>')).toBe('Content')
  })

  it('should remove nested tags', () => {
    expect(stripHtml('<div><p>Nested</p></div>')).toBe('Nested')
  })

  it('should prevent XSS script tags', () => {
    expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")')
    expect(stripHtml('<img onerror="alert(1)" src=x>')).toBe('')
  })

  it('should handle empty strings and special characters', () => {
    expect(stripHtml('')).toBe('')
    expect(stripHtml('No HTML')).toBe('No HTML')
    expect(stripHtml('<b>Bold</b> and <i>italic</i>')).toBe('Bold and italic')
  })
})
