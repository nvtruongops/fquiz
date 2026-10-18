import { useSubmitAnswer } from '../useSubmitAnswer'
import { useSessionFinalize } from '../useSessionFinalize'
import { renderHook, resetHooks } from '../../../../../test/hookHarness'

jest.mock('react', () => require('../../../../../test/hookHarness').reactHooks)
jest.mock('@tanstack/react-query', () => ({ useMutation: (options: any) => options, useQueryClient: () => ({}) }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push() {} }) }))
jest.mock('@/store/quiz/quiz-session.store', () => ({ useQuizSessionStore: () => ({}) }))
jest.mock('@/store/shared/toast-store', () => ({ useToast: () => ({ toast: { error() {} } }) }))
jest.mock('@/lib/core/security/csrf', () => ({ withCsrfHeaders: () => ({}) }))
jest.mock('@/store/shared/auth-prompt-store', () => ({ promptSessionReauth() {} }))
jest.mock('@/components/quiz/shared/QuizLoader', () => ({ useSessionLoader: () => ({ open() {}, advance() {}, close() {} }) }))

describe('session mutation boundaries', () => {
  beforeEach(() => { resetHooks(); global.fetch = jest.fn() })
  afterEach(resetHooks)

  it('blocks answer mutation even when called programmatically after lease loss', async () => {
    const mutation = renderHook(() => (useSubmitAnswer as any)('s1', () => false)) as any
    await expect(mutation.mutationFn({ questionIndex: 0, answerIndexes: [1] })).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('blocks direct finalization while permission or answer acknowledgement is missing', async () => {
    const mutation = renderHook(() => useSessionFinalize({ sessionId: 's1', quizId: 'q1', canFinalize: () => false } as any)).finalizeMutation as any
    await expect(mutation.mutationFn()).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('uses current authority even for a previously-created finalization callback', async () => {
    let writable = true
    const mutation = renderHook(() => useSessionFinalize({ sessionId: 's1', quizId: 'q1', canFinalize: () => writable })).finalizeMutation as any
    writable = false
    await expect(mutation.mutationFn()).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects an old answer mutation after switching sessions', async () => {
    const previous = renderHook(() => useSubmitAnswer('s1', () => true)) as any
    renderHook(() => useSubmitAnswer('s2', () => true))
    await expect(previous.mutationFn({ questionIndex: 0, answerIndexes: [1] })).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })
})
