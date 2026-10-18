import { QueryClient, MutationObserver } from '@tanstack/query-core'
import { useSubmitAnswer } from '../useSubmitAnswer'
import { useSessionFinalize } from '../useSessionFinalize'
import { renderHook, resetHooks } from '../../../../../test/hookHarness'

jest.mock('react', () => require('../../../../../test/hookHarness').reactHooks)
jest.mock('@tanstack/react-query', () => ({ useMutation: (options: any) => options, useQueryClient: () => mockClient }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: (url: string) => mockEvents.push(`navigate:${url}`) }) }))
jest.mock('@/store/quiz/quiz-session.store', () => {
  const useQuizSessionStore = () => ({
    markAnswered: () => mockEvents.push(`mark:${mockSessionId}`),
    setLastAnswerResult: () => mockEvents.push(`feedback:${mockSessionId}`),
  })
  useQuizSessionStore.getState = () => ({ sessionId: mockSessionId, currentQuestionIndex: 0 })
  return { useQuizSessionStore }
})
jest.mock('@/store/shared/toast-store', () => ({ useToast: () => ({ toast: { error() {} } }) }))
jest.mock('@/lib/core/security/csrf', () => ({ withCsrfHeaders: () => ({}) }))
jest.mock('@/store/shared/auth-prompt-store', () => ({ promptSessionReauth() {} }))
jest.mock('@/components/quiz/shared/QuizLoader', () => ({ useSessionLoader: () => ({
  open() {}, advance() {}, close() {}, completeAndNavigate: (navigate: () => void) => navigate(),
}) }))

let mockSessionId: string
let mockEvents: string[]
let mockClient: QueryClient

describe('installed query-core pending mutation session identity', () => {
  beforeEach(() => {
    resetHooks(); mockEvents = []; mockSessionId = 's1'
    mockClient = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } })
  })
  afterEach(() => { resetHooks(); mockClient.clear() })

  it('does not acknowledge s1 response in s2 after observer options change', async () => {
    let finish!: (value: any) => void
    const started = new Promise<void>((resolve) => {
      global.fetch = jest.fn(() => {
        mockEvents.push('request:s1'); resolve()
        return new Promise((done) => { finish = done })
      }) as any
    })
    const oldOptions = renderHook(() => useSubmitAnswer('s1')) as any
    const observer = new MutationObserver(mockClient, oldOptions)
    const pending = observer.mutate({ questionIndex: 0, answerIndexes: [1] })
    await started
    mockSessionId = 's2'
    const nextOptions = renderHook(() => useSubmitAnswer('s2')) as any
    observer.setOptions(nextOptions)
    finish({ ok: true, json: async () => ({ isCorrect: true, correctAnswer: 1 }) })
    await pending
    expect(mockEvents).toEqual(['request:s1'])
    expect(mockClient.getQueryData(['sessions', 's2', 'all-questions'])).toBeUndefined()
  })

  it('does not navigate to s2 results for an s1 finalization response', async () => {
    let finish!: (value: any) => void
    const started = new Promise<void>((resolve) => {
      global.fetch = jest.fn(() => {
        mockEvents.push('submit:s1'); resolve()
        return new Promise((done) => { finish = done })
      }) as any
    })
    const oldOptions = renderHook(() => useSessionFinalize({ sessionId: 's1', quizId: 'q1' })).finalizeMutation as any
    const observer = new MutationObserver(mockClient, oldOptions)
    const pending = observer.mutate(undefined)
    await started
    const nextOptions = renderHook(() => useSessionFinalize({ sessionId: 's2', quizId: 'q2' })).finalizeMutation as any
    observer.setOptions(nextOptions)
    finish({ ok: true, json: async () => ({ completed: true, score: 1, totalQuestions: 1 }) })
    await pending
    expect(mockEvents).toEqual(['submit:s1'])
  })
})
