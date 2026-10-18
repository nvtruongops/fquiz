import { renderHook, resetHooks } from '../../../../../test/hookHarness'
import { useAdminQuizzes } from '../useAdminQuizzes'

let queryOptions: any[] = []
const originalFetch = global.fetch

jest.mock('react', () => ({ ...jest.requireActual('react'), ...require('../../../../../test/hookHarness').reactHooks }))
jest.mock('@tanstack/react-query', () => ({
  keepPreviousData: jest.requireActual('@tanstack/react-query').keepPreviousData,
  useQuery: (options: any) => { queryOptions.push(options); return { data: undefined, isLoading: false, isFetching: false } },
  useMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}))
jest.mock('@/hooks/useToast', () => ({ toast: jest.fn() }), { virtual: true })

describe('useAdminQuizzes search query', () => {
  beforeEach(() => {
    resetHooks()
    jest.useRealTimers()
    queryOptions = []
    global.fetch = originalFetch
  })

  afterEach(() => {
    resetHooks()
    jest.useRealTimers()
    global.fetch = originalFetch
  })

  it('waits 300ms and uses the trimmed search as its query key', () => {
    jest.useFakeTimers()
    const quizzes = renderHook(useAdminQuizzes)
    expect(queryOptions[queryOptions.length - 1].enabled).toBe(true)
    quizzes.setSearch('  grammar  ')
    renderHook(useAdminQuizzes)
    expect(queryOptions[queryOptions.length - 1].queryKey).toEqual(['admin', 'quizzes', 1, 'all', ''])

    jest.advanceTimersByTime(299)
    renderHook(useAdminQuizzes)
    expect(queryOptions[queryOptions.length - 1].queryKey).toEqual(['admin', 'quizzes', 1, 'all', ''])

    jest.advanceTimersByTime(1)
    renderHook(useAdminQuizzes)
    expect(queryOptions[queryOptions.length - 1].queryKey).toEqual(['admin', 'quizzes', 1, 'all', 'grammar'])
  })

  it('holds category and page changes until a later-page search commits at page one', () => {
    jest.useFakeTimers()
    const quizzes = renderHook(useAdminQuizzes)
    quizzes.setPage(3)
    renderHook(useAdminQuizzes)
    const quizQueries = () => queryOptions.filter(({ queryKey }) => queryKey[1] === 'quizzes')
    const start = quizQueries().length

    quizzes.setSearch('  history  ')
    renderHook(useAdminQuizzes)
    expect(quizQueries().at(-1).queryKey).toEqual(['admin', 'quizzes', 3, 'all', ''])
    expect(quizQueries().at(-1).enabled).toBe(false)

    quizzes.setCategory('category-1')
    quizzes.setPage(1)
    renderHook(useAdminQuizzes)
    expect(quizQueries().at(-1).queryKey).toEqual(['admin', 'quizzes', 1, 'category-1', ''])
    expect(quizQueries().at(-1).enabled).toBe(false)
    expect(quizQueries().slice(start).some(({ queryKey, enabled }) => queryKey[2] === 1 && queryKey[4] === '' && enabled)).toBe(false)

    jest.advanceTimersByTime(300)
    renderHook(useAdminQuizzes)
    const committedQueries = quizQueries().slice(start).filter(({ queryKey }) => queryKey.join('|') === 'admin|quizzes|1|category-1|history')
    expect(committedQueries).toHaveLength(1)
    expect(committedQueries[0].enabled).toBe(true)
  })

  it('forwards the query signal and keeps prior quiz rows while refetching', async () => {
    jest.useFakeTimers()
    const previousData = { quizzes: [], total: 0 }
    const quizzes = renderHook(useAdminQuizzes)
    const initialQuery = queryOptions[queryOptions.length - 1]
    expect(initialQuery.placeholderData(previousData)).toBe(previousData)

    quizzes.setSearch('  history  ')
    renderHook(useAdminQuizzes)
    jest.advanceTimersByTime(300)
    renderHook(useAdminQuizzes)

    const signal = new AbortController().signal
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => previousData })
    global.fetch = fetchMock
    await queryOptions[queryOptions.length - 1].queryFn({ signal })

    expect(fetchMock).toHaveBeenCalledWith('/api/quizzes?page=1&limit=10&search=history', { credentials: 'include', signal })
  })
})
