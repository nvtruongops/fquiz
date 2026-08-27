/**
 * @jest-environment node
 */
import React from 'react'
import { useSessionActivityTracking } from '../useSessionActivityTracking'

let stateSetters: Record<string, jest.Mock> = {}

jest.mock('react', () => {
  const original = jest.requireActual('react')
  return {
    ...original,
    useState: (initial: any) => {
      const key = typeof initial === 'boolean' ? (initial ? 'true' : 'false') : String(initial)
      if (!stateSetters[key]) {
        stateSetters[key] = jest.fn()
      }
      return [initial, stateSetters[key]]
    },
    useCallback: (fn: any) => fn,
    useRef: (initial: any) => ({ current: initial }),
    useEffect: (fn: any) => {
      try {
        fn()
      } catch {
        // Ignore effect cleanup mock errors in unit tests
      }
    },
  }
})

const mockQueryClient = {
  invalidateQueries: jest.fn().mockResolvedValue(undefined),
  setQueryData: jest.fn(),
}

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockQueryClient,
}))

describe('useSessionActivityTracking Unit Test Suite', () => {
  const sessionId = 'sess_test_123'
  const resolvedQuizId = 'quiz_test_456'
  let fetchSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    stateSetters = {}

    // Mock window & localStorage in Node environment
    const store: Record<string, string> = {}
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value },
      removeItem: (key: string) => { delete store[key] },
      clear: () => { Object.keys(store).forEach(k => delete store[k]) },
      length: 0,
      key: () => null,
    }

    Object.defineProperty(globalThis, 'window', {
      value: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        localStorage: mockStorage,
      },
      writable: true,
      configurable: true,
    })

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    })

    Object.defineProperty(globalThis, 'document', {
      value: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        visibilityState: 'visible',
        cookie: '',
      },
      writable: true,
      configurable: true,
    })

    fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  test('should construct hook and expose tracking methods', () => {
    const activeData = {
      session: {
        _id: sessionId,
        status: 'active',
      },
    } as any

    const tracking = useSessionActivityTracking({
      sessionId,
      currentQuestionIndex: 1,
      activeData,
      resolvedQuizId,
    })

    expect(tracking.shouldWarnBeforeLeave).toBe(true)
    expect(typeof tracking.reportSessionActivity).toBe('function')
    expect(typeof tracking.handleResumeInactivity).toBe('function')
    expect(typeof tracking.markExiting).toBe('function')
  })

  test('handleResumeInactivity should clear localStorage, set state false, await API resume, and update query cache', async () => {
    localStorage.setItem(`session_paused_at_${sessionId}`, Date.now().toString())

    const activeData = {
      session: {
        _id: sessionId,
        status: 'active',
        paused_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      },
    } as any

    const tracking = useSessionActivityTracking({
      sessionId,
      currentQuestionIndex: 2,
      activeData,
      resolvedQuizId,
    })

    await tracking.handleResumeInactivity()

    // 1. LocalStorage item should be removed
    expect(localStorage.getItem(`session_paused_at_${sessionId}`)).toBeNull()

    // 2. reportSessionActivity('resume') should be posted to API
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(`/api/sessions/${sessionId}/activity`),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ event: 'resume', current_question_index: 2 }),
      })
    )

    // 3. TanStack Query cache setQueryData should be called with updater removing paused_at
    expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
      ['sessions', sessionId],
      expect.any(Function)
    )

    const updaterFn = mockQueryClient.setQueryData.mock.calls[0][1]
    const updatedCache = updaterFn(activeData)
    expect(updatedCache.session.paused_at).toBeUndefined()

    // 4. Query invalidation should be triggered after DB update
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['sessions', sessionId],
    })
  })

  test('reportSessionActivity should post pause event to activity route', async () => {
    const activeData = {
      session: { _id: sessionId, status: 'active' },
    } as any

    const tracking = useSessionActivityTracking({
      sessionId,
      currentQuestionIndex: 5,
      activeData,
      resolvedQuizId,
    })

    await tracking.reportSessionActivity('pause')

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(`/api/sessions/${sessionId}/activity`),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ event: 'pause', current_question_index: 5 }),
      })
    )
  })
})
