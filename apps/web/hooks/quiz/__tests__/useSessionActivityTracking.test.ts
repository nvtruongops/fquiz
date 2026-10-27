import { useSessionActivityTracking } from '../useSessionActivityTracking'
import { renderHook, resetHooks } from '../../../../../test/hookHarness'

jest.mock('react', () => require('../../../../../test/hookHarness').reactHooks)
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => mockQueryClient }))
jest.mock('@/lib/core/security/csrf', () => ({ withCsrfHeaders: (headers: any) => headers }))

const mockQueryClient = {
  invalidateQueries: jest.fn().mockResolvedValue(undefined),
  setQueryData: jest.fn(),
}

describe('session activity tracking', () => {
  const sessionId = 'sess_test_123'
  const resolvedQuizId = 'quiz_test_456'
  let fetchSpy: jest.SpyInstance
  let props: any
  let localValues: Map<string, string>
  let globalListeners: Map<string, EventListener>
  let documentListeners: Map<string, EventListener>

  const render = () => renderHook(() => useSessionActivityTracking(props)) as any

  beforeEach(() => {
    resetHooks()
    jest.clearAllMocks()
    localValues = new Map()
    globalListeners = new Map()
    documentListeners = new Map()
    const mockStorage = {
      getItem: (key: string) => localValues.get(key) ?? null,
      setItem: (key: string, value: string) => { localValues.set(key, value) },
      removeItem: (key: string) => { localValues.delete(key) },
      clear: () => { localValues.clear() },
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
        addEventListener: jest.fn((type: string, listener: EventListener) => documentListeners.set(type, listener)),
        removeEventListener: jest.fn((type: string) => documentListeners.delete(type)),
        visibilityState: 'visible',
        cookie: '',
      },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'history', {
      value: { pushState: jest.fn() },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'location', {
      value: { href: 'https://web.example.test/session' },
      writable: true,
      configurable: true,
    })
    globalThis.addEventListener = jest.fn((type: string, listener: EventListener) => globalListeners.set(type, listener)) as any
    globalThis.removeEventListener = jest.fn((type: string) => globalListeners.delete(type)) as any

    fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    props = {
      sessionId,
      currentQuestionIndex: 0,
      activeData: { session: { _id: sessionId, status: 'active' } },
      resolvedQuizId,
      canWrite: () => true,
    }
  })

  afterEach(() => {
    resetHooks()
    fetchSpy.mockRestore()
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  it('keeps the activity callback stable and reads the latest question index', async () => {
    const first = render()
    const report = first.reportSessionActivity
    expect(fetchSpy).toHaveBeenCalledTimes(1) // one mount resume

    for (let index = 1; index <= 20; index += 1) {
      props.currentQuestionIndex = index
      expect(render().reportSessionActivity).toBe(report)
    }
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    await report('pause')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchSpy.mock.calls[1][1].body)).toEqual({
      event: 'pause',
      current_question_index: 20,
    })
  })

  it('does not write activity or optimistic cache state without the exam lease', async () => {
    props.canWrite = () => false
    localStorage.setItem(`session_paused_at_${sessionId}`, '123')

    const tracking = render()
    await tracking.reportSessionActivity('pause')
    await tracking.handleResumeInactivity()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(localStorage.getItem(`session_paused_at_${sessionId}`)).toBe('123')
    expect(mockQueryClient.setQueryData).not.toHaveBeenCalled()
    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled()
  })

  it('updates and invalidates only the initial session query when resuming', async () => {
    props.activeData = {
      session: {
        _id: sessionId,
        status: 'active',
        paused_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      },
    }
    const tracking = render()
    localStorage.setItem(`session_paused_at_${sessionId}`, Date.now().toString())
    await tracking.handleResumeInactivity()

    expect(localStorage.getItem(`session_paused_at_${sessionId}`)).toBeNull()
    expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
      ['sessions', sessionId, 'initial'],
      expect.any(Function),
    )
    const updater = mockQueryClient.setQueryData.mock.calls[0][1]
    const updated = updater(props.activeData)
    expect(updated.session.paused_at).toBeUndefined()
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['sessions', sessionId, 'initial'],
      exact: true,
    })
    expect(mockQueryClient.invalidateQueries.mock.calls).toHaveLength(1)
  })

  it('sends one request for each actual pause or resume transition across browser events', async () => {
    const now = Date.now()
    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(now)
    render()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    dateNow.mockReturnValue(now + 2_000)
    ;(document as any).visibilityState = 'hidden'
    documentListeners.get('visibilitychange')?.(new Event('visibilitychange'))
    globalListeners.get('pagehide')?.(new Event('pagehide'))

    ;(document as any).visibilityState = 'visible'
    documentListeners.get('visibilitychange')?.(new Event('visibilitychange'))
    expect(fetchSpy).toHaveBeenCalledTimes(3) // mount resume, pause, resume
    const events = fetchSpy.mock.calls.map(([, init]) => JSON.parse(init.body).event)
    expect(events).toEqual(['resume', 'pause', 'resume'])
  })

  it('does not send activity requests for window focus or blur when tab visibility has not changed', async () => {
    render()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    globalListeners.get('blur')?.(new Event('blur'))
    globalListeners.get('focus')?.(new Event('focus'))

    expect(fetchSpy).toHaveBeenCalledTimes(1) // mount resume only
    expect(global.addEventListener).not.toHaveBeenCalledWith('blur', expect.any(Function))
    expect(global.addEventListener).not.toHaveBeenCalledWith('focus', expect.any(Function))
  })

  it('still opens the inactivity pause after five minutes without interaction', () => {
    jest.useFakeTimers()
    render()

    jest.advanceTimersByTime(5 * 60 * 1000)

    expect(render().inactivityPauseOpen).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchSpy.mock.calls[1][1].body).event).toBe('pause')
  })

  it('allows the same transition to retry after the activity API returns an error', async () => {
    const tracking = render()
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 503 }))

    await expect(tracking.reportSessionActivity('pause')).resolves.toBe(false)
    await expect(tracking.reportSessionActivity('pause')).resolves.toBe(true)

    expect(fetchSpy).toHaveBeenCalledTimes(3) // mount resume, failed pause, retry pause
  })

  it('does not roll back to an unconfirmed transition when requests finish out of order', async () => {
    let resolveMountResume!: (response: Response) => void
    fetchSpy.mockImplementationOnce(() => new Promise((resolve) => { resolveMountResume = resolve }))
    const tracking = render()
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 503 }))

    await expect(tracking.reportSessionActivity('pause')).resolves.toBe(false)
    await expect(tracking.reportSessionActivity('resume')).resolves.toBe(true)
    resolveMountResume(new Response(null, { status: 503 }))
    await Promise.resolve()

    await expect(tracking.reportSessionActivity('resume')).resolves.toBe(false)
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })
})
