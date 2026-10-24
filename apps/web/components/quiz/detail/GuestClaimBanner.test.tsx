jest.mock('react', () => ({
  ...jest.requireActual('react'),
  ...require('../../../../../test/hookHarness').reactHooks,
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => ({ get: (name: string) => (name === 'claim' ? 'true' : null) }),
}))
jest.mock('@/hooks/auth/useAuth', () => ({ useAuth: () => ({ data: { user: { _id: 'student-1' } } }) }))
jest.mock('@/store/shared/toast-store', () => ({ useToast: () => ({ toast: { success: jest.fn(), error: jest.fn() } }) }))
jest.mock('@/lib/core/security/csrf', () => ({ withCsrfHeaders: (headers: Record<string, string>) => headers }))

import { renderHook, resetHooks } from '../../../../../test/hookHarness'
import { GuestClaimBanner } from './GuestClaimBanner'

const originalFetch = global.fetch

beforeEach(() => {
  resetHooks()
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
})

afterEach(() => {
  resetHooks()
  global.fetch = originalFetch
})

test('does not claim a guest result automatically from a query parameter', () => {
  renderHook(() => GuestClaimBanner({ sessionId: 'session-1', quizId: 'quiz-1', score: 1, totalQuestions: 2 }))

  expect(global.fetch).not.toHaveBeenCalled()
})
