import { useSessionLoader } from './QuizLoader'
import { renderHook, resetHooks } from '../../../../../test/hookHarness'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  ...require('../../../../../test/hookHarness').reactHooks,
}))

describe('session quiz loader', () => {
  beforeEach(resetHooks)
  afterEach(resetHooks)

  it('does not reopen the full-screen loader while the quiz transition loader is active', () => {
    const root = globalThis as any
    const originalWindow = root.window
    const originalExpiry = originalWindow?.__QUIZ_LOADER_ACTIVE_UNTIL__
    if (!originalWindow) Object.defineProperty(root, 'window', { configurable: true, value: {} })
    root.window.__QUIZ_LOADER_ACTIVE_UNTIL__ = Date.now() + 5000

    try {
      const loader = renderHook(() => useSessionLoader(true))
      expect(loader.isOpen).toBe(false)
    } finally {
      if (originalWindow) originalWindow.__QUIZ_LOADER_ACTIVE_UNTIL__ = originalExpiry
      else delete root.window
    }
  })
})
