import { fetchAllQuestions, fetchSession } from '../session-api'
import { useAuthPrompt } from '@/store/shared/auth-prompt-store'

const QUIZ_PATH = '/quiz/quiz-1/session/session-1'

describe('session GET requests', () => {
  let originalWindowDescriptor: PropertyDescriptor | undefined
  let location: { pathname: string; search: string; href: string }

  beforeEach(() => {
    originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
    location = { pathname: QUIZ_PATH, search: '?question=2', href: '' }
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location },
    })
    useAuthPrompt.getState().closeAuthPrompt()
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }))
  })

  afterEach(() => {
    useAuthPrompt.getState().closeAuthPrompt()
    jest.restoreAllMocks()
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it.each([
    ['fetchSession', fetchSession],
    ['fetchAllQuestions', fetchAllQuestions],
  ])('%s keeps the quiz open and prompts for re-authentication on 401', async (_name, fetcher) => {
    await expect(fetcher('session-1')).rejects.toMatchObject({ status: 401 })

    expect(useAuthPrompt.getState().isOpen).toBe(true)
    expect(location).toEqual({ pathname: QUIZ_PATH, search: '?question=2', href: '' })
  })
})
