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
      process.env.APP_URL = 'web.example.test'
      expect(resolveAppBaseUrl()).toBe('https://web.example.test')
    })

    test('prefers NEXT_PUBLIC_APP_URL over the Vercel deployment URL', () => {
      delete process.env.APP_URL
      process.env.NEXT_PUBLIC_APP_URL = 'https://web.example.test'
      process.env.VERCEL_PROJECT_PRODUCTION_URL = 'https://project.example.test'

      expect(resolveAppBaseUrl()).toBe('https://web.example.test')
    })

    test('resolves from Vercel URL when APP_URL is absent', () => {
      delete process.env.APP_URL
      delete process.env.NEXT_PUBLIC_APP_URL
      process.env.VERCEL_PROJECT_PRODUCTION_URL = 'https://project.example.test'

      expect(resolveAppBaseUrl()).toBe('https://project.example.test')
    })

    test('falls back to the request origin and requires configuration otherwise', () => {
      delete process.env.APP_URL
      delete process.env.NEXT_PUBLIC_APP_URL
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL
      delete process.env.VERCEL_URL

      const request = new Request('https://web.example.test/path')
      expect(resolveAppBaseUrl(request)).toBe('https://web.example.test')
      expect(() => resolveAppBaseUrl()).toThrow('APP_URL or a deployment URL is required')
    })
  })
})
