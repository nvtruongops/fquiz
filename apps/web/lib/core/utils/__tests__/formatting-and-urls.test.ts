import { formatStudyDuration } from '../format'
import { extractApiErrorMessage } from '../error-utils'
import { resolveAppBaseUrl } from '../url-utils'

describe('Formatting & URL Utilities Test Suite', () => {
  describe('formatStudyDuration', () => {
    test('formats minutes under 60 in long and short forms', () => {
      expect(formatStudyDuration(45, false)).toBe('45 mins')
      expect(formatStudyDuration(45, true)).toBe('45m')
    })

    test('formats exact hours', () => {
      expect(formatStudyDuration(120, false)).toBe('2 hours')
      expect(formatStudyDuration(120, true)).toBe('2h')
    })

    test('formats hours and remaining minutes', () => {
      expect(formatStudyDuration(150, false)).toBe('2 hours 30 mins')
      expect(formatStudyDuration(150, true)).toBe('2h 30m')
    })
  })

  describe('extractApiErrorMessage', () => {
    test('returns raw string error', () => {
      expect(extractApiErrorMessage('Network error')).toBe('Network error')
    })

    test('handles Zod array issues', () => {
      const zodIssue = [{ path: ['question', 'title'], message: 'Cannot be empty' }]
      expect(extractApiErrorMessage(zodIssue)).toBe('question.title: Cannot be empty')
    })

    test('handles flat error objects with message or error key', () => {
      expect(extractApiErrorMessage({ message: 'Token expired' })).toBe('Token expired')
      expect(extractApiErrorMessage({ error: 'Permission denied' })).toBe('Permission denied')
    })

    test('handles fieldErrors and formErrors objects', () => {
      const errorObj = { fieldErrors: { title: ['Title is too short'] }, formErrors: [] }
      expect(extractApiErrorMessage(errorObj)).toBe('Title is too short')
    })

    test('returns default fallback when empty or unknown', () => {
      expect(extractApiErrorMessage(null)).toBe('Save failed')
      expect(extractApiErrorMessage({})).toBe('Save failed')
    })
  })

  describe('resolveAppBaseUrl', () => {
    const originalEnv = process.env

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    test('resolves from process.env.APP_URL', () => {
      process.env.APP_URL = 'example.invalid'
      expect(resolveAppBaseUrl()).toBe('https://example.invalid')
    })

    test('resolves from Vercel URL when APP_URL is absent', () => {
      delete process.env.APP_URL
      delete process.env.NEXT_PUBLIC_APP_URL
      process.env.VERCEL_PROJECT_PRODUCTION_URL = 'https://example.invalid'

      expect(resolveAppBaseUrl()).toBe('https://example.invalid')
    })

    test('falls back to request headers or localhost', () => {
      delete process.env.APP_URL
      delete process.env.NEXT_PUBLIC_APP_URL
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL
      delete process.env.VERCEL_URL

      const mockReq = {
        headers: new Map([['host', 'localhost:3000']]),
      } as unknown as Request
      mockReq.headers.get = (key: string) => (key === 'host' ? 'localhost:3000' : null)

      expect(resolveAppBaseUrl(mockReq)).toBe('http://localhost:3000')
      expect(resolveAppBaseUrl()).toBe('http://localhost:3000')
    })
  })
})
