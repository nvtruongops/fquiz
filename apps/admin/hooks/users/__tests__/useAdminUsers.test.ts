import { renderHook, resetHooks } from '../../../../../test/hookHarness'
import { useAdminUsers } from '../useAdminUsers'

const retry = jest.fn()
let queryState: any
let queryOptions: any[] = []
const originalFetch = global.fetch

jest.mock('react', () => ({ ...jest.requireActual('react'), ...require('../../../../../test/hookHarness').reactHooks }))
jest.mock('@tanstack/react-query', () => ({
  keepPreviousData: jest.requireActual('@tanstack/react-query').keepPreviousData,
  useQuery: (options: any) => { queryOptions.push(options); return queryState },
  useMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}))
jest.mock('@/hooks/useToast', () => ({ toast: jest.fn() }), { virtual: true })

describe('useAdminUsers query feedback', () => {
  beforeEach(() => {
    resetHooks()
    jest.useRealTimers()
    retry.mockClear()
    queryOptions = []
    global.fetch = originalFetch
    queryState = { data: undefined, isLoading: false, isError: true, error: new Error('Failed to load user list'), refetch: retry }
  })

  afterEach(() => {
    resetHooks()
    jest.useRealTimers()
    global.fetch = originalFetch
  })

  it('exposes load error and retry from the query', () => {
    const users = renderHook(useAdminUsers)
    expect(users.isError).toBe(true)
    expect(users.error?.message).toBe('Failed to load user list')
    users.refetch()
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('keeps query data available when a background refetch fails', () => {
    queryState.data = { users: [{ _id: '1', username: 'admin', email: 'admin@example.com', role: 'admin', status: 'active', created_at: '2026-01-01' }], total: 1, page: 1, totalPages: 1 }
    const users = renderHook(useAdminUsers)
    expect(users.data?.users[0].username).toBe('admin')
    expect(users.isError).toBe(true)
  })

  it('waits 300ms and uses the trimmed search as its query key', () => {
    jest.useFakeTimers()
    const users = renderHook(useAdminUsers)
    expect(queryOptions.at(-1).enabled).toBe(true)
    users.setSearch('  marina  ')

    renderHook(useAdminUsers)
    expect(queryOptions.at(-1).queryKey).toEqual(['admin', 'users', 1, '', '', ''])

    jest.advanceTimersByTime(299)
    renderHook(useAdminUsers)
    expect(queryOptions.at(-1).queryKey).toEqual(['admin', 'users', 1, '', '', ''])

    jest.advanceTimersByTime(1)
    renderHook(useAdminUsers)
    expect(queryOptions.at(-1).queryKey).toEqual(['admin', 'users', 1, 'marina', '', ''])
  })

  it('holds filter and page changes until a later-page search commits at page one', () => {
    jest.useFakeTimers()
    const users = renderHook(useAdminUsers)
    users.setPage(3)
    renderHook(useAdminUsers)
    const start = queryOptions.length

    users.setSearch('  marina  ')
    renderHook(useAdminUsers)
    expect(queryOptions.at(-1).queryKey).toEqual(['admin', 'users', 3, '', '', ''])
    expect(queryOptions.at(-1).enabled).toBe(false)

    users.setStatus('banned')
    users.setPage(1)
    renderHook(useAdminUsers)
    expect(queryOptions.at(-1).queryKey).toEqual(['admin', 'users', 1, '', '', 'banned'])
    expect(queryOptions.at(-1).enabled).toBe(false)
    expect(queryOptions.slice(start).some(({ queryKey, enabled }) => queryKey[2] === 1 && queryKey[3] === '' && enabled)).toBe(false)

    jest.advanceTimersByTime(300)
    renderHook(useAdminUsers)
    const committedQueries = queryOptions.slice(start).filter(({ queryKey }) => queryKey.join('|') === 'admin|users|1|marina||banned')
    expect(committedQueries).toHaveLength(1)
    expect(committedQueries[0].enabled).toBe(true)
  })

  it('forwards the query signal and retains the prior result while search changes', async () => {
    jest.useFakeTimers()
    const previousData = { users: [], total: 0, page: 1, totalPages: 0 }
    queryState = { ...queryState, data: previousData, isLoading: false, isFetching: true }
    const users = renderHook(useAdminUsers)
    const initialQuery = queryOptions.at(-1)
    expect(initialQuery.placeholderData(previousData)).toBe(previousData)

    users.setSearch('  Lee  ')
    renderHook(useAdminUsers)
    jest.advanceTimersByTime(300)
    renderHook(useAdminUsers)

    const signal = new AbortController().signal
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => previousData })
    global.fetch = fetchMock
    await queryOptions.at(-1).queryFn({ signal })

    expect(fetchMock).toHaveBeenCalledWith('/api/users?page=1&limit=10&search=Lee', { credentials: 'include', signal })
  })
})
