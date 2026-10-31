import { useQuery } from '@tanstack/react-query'
import { resetHooks, renderHook } from '../../../../../test/hookHarness'
import { useQuizSessionQueries } from '../useQuizSessionQueries'
import { useAuth } from '@/hooks/auth/useAuth'

jest.mock('react', () => require('../../../../../test/hookHarness').reactHooks)
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }))
jest.mock('@/hooks/auth/useAuth', () => ({ useAuth: jest.fn() }))

const mockedUseQuery = useQuery as jest.Mock

function queryState(data: unknown, isError: boolean) {
  const error = isError ? Object.assign(new Error('Session expired.'), { status: 401 }) : null
  return {
    data,
    isLoading: false,
    isFetching: false,
    isError,
    error,
    refetch: jest.fn().mockResolvedValue({ data, error: null, isError: false }),
  }
}

describe('useQuizSessionQueries recovery', () => {
  beforeEach(() => {
    resetHooks()
    mockedUseQuery.mockReset()
    ;(useAuth as jest.Mock).mockReturnValue({ data: { user: { _id: 'owner-a' } } })
  })

  afterEach(resetHooks)

  it('keeps cached session and questions usable when background GETs return 401', () => {
    const cachedSession = {
      session: { _id: 'session-1', totalQuestions: 1, status: 'active' },
      question: { _id: 'question-1', text: 'Saved question', options: ['A'] },
    }
    const cachedQuestions = {
      questions: [{ _id: 'question-1', text: 'Saved question', options: ['A'] }],
    }
    const sessionQuery = queryState(cachedSession, true)
    const questionsQuery = queryState(cachedQuestions, true)
    mockedUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) =>
      queryKey[2] === 'initial' ? sessionQuery : questionsQuery
    )

    const result = renderHook(() => useQuizSessionQueries('session-1', 0))

    expect(result.initialData).toBe(cachedSession)
    expect(result.preloadData).toBe(cachedQuestions)
    expect(result.currentQuestion).toBe(cachedQuestions.questions[0])
    expect(result.activeData?.question).toBe(cachedQuestions.questions[0])
    expect(result.isInitialError).toBe(false)
    expect(result.isPreloadError).toBe(false)
    const refetches = result as typeof result & {
      refetchInitial?: () => unknown
      refetchPreload?: () => unknown
    }
    expect(refetches.refetchInitial).toBe(sessionQuery.refetch)
    expect(refetches.refetchPreload).toBe(questionsQuery.refetch)
  })

  it('exposes a same-page refetch for an uncached 401', () => {
    const sessionQuery = queryState(undefined, true)
    const questionsQuery = queryState(undefined, false)
    mockedUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) =>
      queryKey[2] === 'initial' ? sessionQuery : questionsQuery
    )

    const result = renderHook(() => useQuizSessionQueries('session-1', 0))

    expect(result.isInitialError).toBe(true)
    const refetchInitial = (result as typeof result & { refetchInitial?: () => unknown }).refetchInitial
    expect(refetchInitial).toBeDefined()
    refetchInitial?.()
    expect(sessionQuery.refetch).toHaveBeenCalledTimes(1)
  })
})
