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
      { questionIndex: 0, answerIndexes: [1], answerRevision: requests[0].payload.answerRevision }, { questionIndex: 0, answerIndexes: [1], answerRevision: requests[0].payload.answerRevision },
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

  it('persists partial, complete, reduced and empty review sets in order', () => {
    props.activeData.question.answer_selection_count = 3
    props.activeData.question.options = ['A', 'B', 'C']
    const expected = [[0], [0, 1], [0, 1, 2], [0, 2], [2], []]
    ;[0, 1, 2, 1, 0, 2].forEach((option, step) => {
      render().handleSelectOption(option)
      expect(requests[step]?.payload).toEqual({ questionIndex: 0, answerIndexes: expected[step], answerRevision: expect.any(Number) })
      requests[step].callbacks.onSuccess({ answerIndexes: expected[step] })
      expect(render().selectedOptions).toEqual(expected[step])
      expect(render().hasUnsavedAnswers()).toBe(false)
      expect([...render().acknowledgedQuestions]).toEqual(step === 2 ? [0] : [])
    })
  })

  it('keeps rapid latest intent while a save is delayed, including clear', () => {
    props.activeData.question.answer_selection_count = 3
    const view = render()
    view.handleSelectOption(0)
    view.handleSelectOption(1)
    expect(render().selectedOptions).toEqual([0, 1])
    expect(requests).toHaveLength(1)
    requests[0].callbacks.onSuccess({ answerIndexes: [0] })
    expect(render().selectedOptions).toEqual([0, 1])
    expect(requests[1].payload.answerIndexes).toEqual([0, 1])
    render().handleSelectOption(0)
    render().handleSelectOption(1)
    requests[1].callbacks.onSuccess({ answerIndexes: [0, 1] })
    expect(render().selectedOptions).toEqual([])
    expect(requests[2].payload.answerIndexes).toEqual([])
    requests[2].callbacks.onSuccess({ answerIndexes: [] })
    expect(render().hasUnsavedAnswers()).toBe(false)
    expect([...render().acknowledgedQuestions]).toEqual([])
  })

  it('retries latest clear after an older request fails without resurrecting scalar answer', () => {
    props.activeData.question.answer_selection_count = 2
    props.activeData.session.user_answers = [{ question_index: 0, answer_index: 1, answer_indexes: [] }]
    expect(render().selectedOptions).toEqual([])
    render().handleSelectOption(0)
    render().handleSelectOption(0)
    requests[0].callbacks.onError(new Error('offline'))
    expect(render().selectedOptions).toEqual([])
    expect(render().saveStatus).toBe('error')
    render().retryFailedAnswer()
    expect(requests[1].payload.answerIndexes).toEqual([])
    requests[1].callbacks.onSuccess({ answerIndexes: [] })
    expect(render().selectedOptions).toEqual([])
    expect(render().hasUnsavedAnswers()).toBe(false)
  })

  it('allows immediate partial finalization and locks as soon as N is selected', () => {
    props.activeData.session.mode = 'immediate'
    props.activeData.question.answer_selection_count = 2
    render().handleSelectOption(0)
    expect(render().hasUnsavedAnswers()).toBe(false)
    expect(render().submitted).toBe(false)
    render().handleSelectOption(0)
    expect(render().selectedOptions).toEqual([])
    render().handleSelectOption(0)
    render().handleSelectOption(1)
    expect(requests).toHaveLength(1)
    expect(render().submitted).toBe(true)
    render().handleSelectOption(0)
    expect(render().selectedOptions).toEqual([0, 1])
  })
  it('locks and blocks finalization for an immediate full answer queued behind another question', () => {
    props.activeData.session.mode = 'immediate'
    props.activeData.question.answer_selection_count = 2
    render().handleSelectOption(0)
    render().handleSelectOption(1)
    props.currentQuestionIndex = 1
    render().handleSelectOption(0)
    render().handleSelectOption(1)
    expect(render().submitted).toBe(true)
    expect(render().hasUnsavedAnswers()).toBe(true)
    render().handleSelectOption(1)
    expect(render().selectedOptions).toEqual([0, 1])
    requests[0].callbacks.onSuccess({ answerIndexes: [0, 1], isCorrect: true })
    expect(requests[1].payload).toEqual({ questionIndex: 1, answerIndexes: [0, 1], answerRevision: expect.any(Number) })
  })

  it('restores a pending clear after reload and retries it instead of the old server scalar', () => {
    const stored = new Map<string, string>()
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    } } })
    try {
      props.activeData.question.answer_selection_count = 2
      props.activeData.session.user_answers = [{ question_index: 0, answer_index: 1, answer_indexes: [0, 1] }]
      render().handleSelectOption(0)
      render().handleSelectOption(1)
      expect(render().selectedOptions).toEqual([])
      resetHooks()
      expect(render().selectedOptions).toEqual([])
      expect(render().saveStatus).toBe('saving')
      expect(requests[1].payload.answerIndexes).toEqual([])
      requests[0].callbacks.onSuccess({ answerIndexes: [1] })
      expect(render().selectedOptions).toEqual([])
      requests[1].callbacks.onSuccess({ answerIndexes: [] })
      expect(render().hasUnsavedAnswers()).toBe(false)
      expect(stored.has('fquiz:answer-drafts:s1')).toBe(false)
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'window', descriptor)
      else delete (globalThis as any).window
    }
  })

  it('resumes the latest queued intent when the tab regains its lease', () => {
    let writable = true
    props.canWrite = () => writable
    props.activeData.question.answer_selection_count = 2
    render().handleSelectOption(0)
    render().handleSelectOption(1)
    writable = false
    render()
    requests[0].callbacks.onSuccess({ answerIndexes: [0] })
    render()
    expect(requests).toHaveLength(1)
    writable = true
    render()
    expect(requests[1]?.payload.answerIndexes).toEqual([0, 1])
  })

  it('persists monotonic intent revisions across reload and retries the same revision', () => {
    const stored = new Map<string, string>()
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
    const clock = jest.spyOn(Date, 'now').mockReturnValue(1000)
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    } } })
    try {
      props.activeData.question.answer_selection_count = 2
      render().handleSelectOption(0)
      const first = requests[0].payload.answerRevision
      expect(Number.isSafeInteger(first)).toBe(true)
      render().handleSelectOption(1)
      resetHooks()
      render()
      const restored = requests[1].payload.answerRevision
      expect(restored).toBeGreaterThan(first)
      requests[1].callbacks.onError(new Error('offline'))
      render().retryFailedAnswer()
      expect(requests[2].payload.answerRevision).toBe(restored)
      requests[2].callbacks.onSuccess({ answerIndexes: [0, 1], answerRevision: restored })
      resetHooks()
      render().handleSelectOption(0)
      expect(requests[3].payload.answerRevision).toBeGreaterThan(restored)
    } finally {
      clock.mockRestore()
      if (descriptor) Object.defineProperty(globalThis, 'window', descriptor)
      else delete (globalThis as any).window
    }
  })

  it('saves a newer revision even when rapid edits return to the in-flight selection', () => {
    props.activeData.question.answer_selection_count = 2
    render().handleSelectOption(0)
    const revision = requests[0].payload.answerRevision
    render().handleSelectOption(1)
    render().handleSelectOption(1)
    requests[0].callbacks.onSuccess({ answerIndexes: [0], answerRevision: revision })
    expect(requests).toHaveLength(2)
    expect(requests[1].payload.answerIndexes).toEqual([0])
    expect(requests[1].payload.answerRevision).toBeGreaterThan(revision)
  })

})
