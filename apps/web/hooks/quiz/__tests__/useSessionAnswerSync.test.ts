import { useSessionAnswerSync } from '../useSessionAnswerSync'
import { renderHook, resetHooks } from '../../../../../test/hookHarness'

jest.mock('react', () => require('../../../../../test/hookHarness').reactHooks)
jest.mock('@/store/quiz/quiz-session.store', () => ({
  useQuizSessionStore: () => ({ setLastAnswerResult: (value: any) => { mockFeedback = value } }),
}))
let mockFeedback: any

describe('session answer acknowledgement', () => {
  let props: any
  let requests: { payload: any; callbacks: any }[]
  const render = () => renderHook(() => useSessionAnswerSync(props)) as any
  beforeEach(() => {
    resetHooks(); requests = []; mockFeedback = null
    const question = { _id: 'q0', text: 'Q', options: ['A', 'B'], correct_answer: 1 }
    props = {
      activeData: { session: { _id: 's1', mode: 'review', user_answers: [] }, question },
      currentQuestionIndex: 0, currentQuestion: question, preloadedQuestions: [question, question],
      isSubmitting: false, canWrite: () => true,
      submitAnswer: (payload: any, callbacks: any) => requests.push({ payload, callbacks }),
    }
  })
  afterEach(resetHooks)

  it('preserves a failed review payload and explicitly retries the same answer', () => {
    render().handleSelectOption(1)
    expect(render().saveStatus).toBe('saving')
    requests[0].callbacks.onError(new Error('offline'))
    expect(render().selectedOptions).toEqual([1])
    expect(render().saveStatus).toBe('error')
    expect(render().hasUnsavedAnswers()).toBe(true)
    render().retryFailedAnswer()
    expect(requests.map((request) => request.payload)).toEqual([
      { questionIndex: 0, answerIndexes: [1] }, { questionIndex: 0, answerIndexes: [1] },
    ])
    requests[1].callbacks.onSuccess({ nextQuestion: {} })
    expect(render().saveStatus).toBe('saved')
    expect(render().hasUnsavedAnswers()).toBe(false)
  })

  it('keeps an in-flight answer intact when session data gets a new object each render', () => {
    const stored = new Map<string, string>()
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {
      sessionStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value),
        removeItem: (key: string) => stored.delete(key),
      },
    } })
    try {
      const renderWithFreshData = () => renderHook(() => useSessionAnswerSync({
        ...props,
        activeData: { ...props.activeData },
      })) as any
      renderWithFreshData().handleSelectOption(1)
      expect(renderWithFreshData().saveStatus).toBe('saving')
      requests[0].callbacks.onSuccess({ nextQuestion: {} })
      expect(renderWithFreshData().saveStatus).toBe('saved')
      expect(renderWithFreshData().hasUnsavedAnswers()).toBe(false)
    } finally {
      if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
      else delete (globalThis as typeof globalThis & { window?: Window }).window
    }
  })

  it('retains failed selections across navigation and ignores late feedback for another question', () => {
    props.activeData.session.mode = 'immediate'
    render().handleSelectOption(1)
    props.currentQuestionIndex = 1
    render()
    requests[0].callbacks.onError(new Error('offline'))
    expect(render().submitted).toBe(false)
    expect(render().selectedOptions).toEqual([])
    expect(mockFeedback).toBeNull()
    props.currentQuestionIndex = 0
    expect(render().selectedOptions).toEqual([1])
    render().retryFailedAnswer()
    props.currentQuestionIndex = 1
    render()
    requests[1].callbacks.onSuccess({ isCorrect: true, correctAnswer: 1 })
    expect(render().submitted).toBe(false)
    expect(mockFeedback).toBeNull()
    props.currentQuestionIndex = 0
    expect(render().submitted).toBe(true)
    expect(render().selectedOptions).toEqual([1])
  })

  it('blocks direct selection and retry after lease loss', () => {
    render().handleSelectOption(1)
    requests[0].callbacks.onError(new Error('offline'))
    props.canWrite = () => false
    render().retryFailedAnswer()
    render().handleSelectOption(0)
    expect(requests).toHaveLength(1)
  })

  it('does not carry drafts or old callbacks into a different session', () => {
    render().handleSelectOption(1)
    props.activeData = { ...props.activeData, session: { ...props.activeData.session, _id: 's2' } }
    expect(render().selectedOptions).toEqual([])
    requests[0].callbacks.onSuccess({ isCorrect: true, correctAnswer: 1 })
    expect(render().saveStatus).toBe('idle')
    expect(render().selectedOptions).toEqual([])
  })

  it('blocks finalization when an acknowledged multi-select answer is edited to an incomplete draft', () => {
    props.activeData.question.answer_selection_count = 2
    props.activeData.session.user_answers = [{ question_index: 0, answer_indexes: [0, 1], is_correct: true }]
    render().handleSelectOption(1)
    expect(render().selectedOptions).toEqual([0])
    expect(render().hasUnsavedAnswers()).toBe(true)
    expect(render().saveStatus).toBe('unsaved')
    expect(requests).toHaveLength(0)
  })

  it('allows a never-saved multi-select question to be skipped after clearing its partial draft', () => {
    props.activeData.question.answer_selection_count = 2
    render().handleSelectOption(0)
    expect(render().hasUnsavedAnswers()).toBe(true)
    render().handleSelectOption(0)
    props.currentQuestionIndex = 1
    expect(render().hasUnsavedAnswers()).toBe(false)
    expect(render().saveStatus).toBe('idle')
    expect(requests).toHaveLength(0)
  })

  it('locates and discards an incomplete edit without losing its acknowledged answer', () => {
    props.activeData.question.answer_selection_count = 2
    render().handleSelectOption(0)
    render().handleSelectOption(1)
    requests[0].callbacks.onSuccess({ nextQuestion: {} })
    render().handleSelectOption(1)
    props.currentQuestionIndex = 1
    expect(render().unsavedQuestionIndex).toBe(0)
    expect(render().hasUnsavedAnswers()).toBe(true)
    render().discardUnsavedAnswer()
    props.currentQuestionIndex = 0
    expect(render().selectedOptions).toEqual([0, 1])
    expect(render().hasUnsavedAnswers()).toBe(false)
    expect([...render().acknowledgedQuestions]).toEqual([0])
    expect(requests).toHaveLength(1)
  })

  it('keeps acknowledgement when a later edit fails', () => {
    render().handleSelectOption(1)
    requests[0].callbacks.onSuccess({ nextQuestion: {} })
    render().handleSelectOption(0)
    requests[1].callbacks.onError(new Error('offline'))
    expect(render().selectedOptions).toEqual([0])
    expect(render().saveStatus).toBe('error')
    expect([...render().acknowledgedQuestions]).toEqual([0])
  })
})
