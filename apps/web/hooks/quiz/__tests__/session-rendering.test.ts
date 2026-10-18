import {
  isQuestionNavigationReady,
  isSessionQuestionReady,
  shouldShowSessionSkeleton,
} from '../session-rendering'

describe('session first-question rendering', () => {
  it('renders the server-hydrated active question without waiting for the full question preload', () => {
    expect(isSessionQuestionReady({
      isInitialLoading: false,
      isReadyToRender: true,
      sessionStatus: 'active',
    })).toBe(true)
  })

  it('keeps the session blocked while the initial request or server hydration is incomplete', () => {
    expect(isSessionQuestionReady({
      isInitialLoading: true,
      isReadyToRender: true,
      sessionStatus: 'active',
    })).toBe(false)
    expect(isSessionQuestionReady({
      isInitialLoading: false,
      isReadyToRender: false,
      sessionStatus: 'active',
    })).toBe(false)
  })

  it('does not render a question while the server is preparing the session', () => {
    expect(isSessionQuestionReady({
      isInitialLoading: false,
      isReadyToRender: true,
      sessionStatus: 'preparing',
    })).toBe(false)
  })
})

describe('session loading fallback', () => {
  it('avoids a skeleton flash while a quiz transition loader is active', () => {
    expect(shouldShowSessionSkeleton(true, false, true)).toBe(false)
  })

  it('avoids replacing the session loader with a skeleton', () => {
    expect(shouldShowSessionSkeleton(true, true, false)).toBe(false)
  })

  it('uses the skeleton during ordinary loading when no loader is active', () => {
    expect(shouldShowSessionSkeleton(true, false, false)).toBe(true)
    expect(shouldShowSessionSkeleton(false, false, false)).toBe(false)
  })
})

describe('question navigation readiness', () => {
  it('blocks navigation until the full question set has loaded', () => {
    expect(isQuestionNavigationReady(1, 10)).toBe(false)
    expect(isQuestionNavigationReady(10, 10)).toBe(true)
  })

  it('allows navigation when a session has no other question to visit', () => {
    expect(isQuestionNavigationReady(null, 1)).toBe(true)
    expect(isQuestionNavigationReady(0, 0)).toBe(false)
  })
})
