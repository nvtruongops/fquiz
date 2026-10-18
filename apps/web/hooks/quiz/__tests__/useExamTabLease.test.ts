import { useExamTabLease } from '../useExamTabLease'
import { renderHook, resetHooks } from '../../../../../test/hookHarness'

jest.mock('react', () => require('../../../../../test/hookHarness').reactHooks)

describe('session tab lease', () => {
  let receive: (event: any) => void
  let posted: any[]
  beforeEach(() => {
    resetHooks(); posted = []
    global.window = {} as any
    global.BroadcastChannel = class {
      postMessage(message: any) { posted.push(message) }
      addEventListener(_type: string, listener: any) { receive = listener }
      removeEventListener() {}
      close() {}
    } as any
  })
  afterEach(resetHooks)

  it('revokes mutation authority synchronously and transfers it explicitly', () => {
    const lease = renderHook(() => useExamTabLease('s1')) as any
    receive({ data: { type: 'CLAIM_LEASE', sessionId: 's1', tabId: 'other' } })
    expect(lease.canWrite()).toBe(false)
    expect(renderHook(() => useExamTabLease('s1')).isReadOnlyTab).toBe(true)
    lease.takeOverLease()
    expect(lease.canWrite()).toBe(true)
    expect(posted[posted.length - 1]).toMatchObject({ force: true, sessionId: 's1' })
  })

  it('initializes authority for a new session without carrying the old lock', () => {
    renderHook(() => useExamTabLease('s1'))
    receive({ data: { type: 'CLAIM_LEASE', sessionId: 's1', tabId: 'other' } })
    const next = renderHook(() => useExamTabLease('s2')) as any
    expect(next.isReadOnlyTab).toBe(false)
    expect(next.canWrite()).toBe(true)
  })
})
