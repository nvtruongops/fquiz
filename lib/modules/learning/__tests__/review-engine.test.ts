import { ReviewEngine, reviewEngine } from '../review-engine'

describe('ReviewEngine', () => {
  let engine: ReviewEngine

  beforeEach(() => {
    engine = new ReviewEngine()
  })

  test('getInitialState returns valid FSRS initial card state', () => {
    const state = engine.getInitialState()
    expect(state.state).toBe('new')
    expect(state.reps).toBe(0)
    expect(state.lapses).toBe(0)
    expect(state.lastReview).toBeInstanceOf(Date)
    expect(state.nextReview).toBeInstanceOf(Date)
  })

  test('calculateNext updates state on rating Good (3)', () => {
    const initial = engine.getInitialState()
    const next = engine.calculateNext(initial, 3)

    expect(next.reps).toBeGreaterThan(0)
    expect(next.lastReview).toBeInstanceOf(Date)
    expect(next.nextReview).toBeInstanceOf(Date)
    expect(next.state).not.toBe('new')
  })

  test('calculateNext throws Error for invalid grade', () => {
    const initial = engine.getInitialState()
    expect(() => engine.calculateNext(initial, 99)).toThrow(
      'Invalid FSRS grade: 99. Must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy).'
    )
  })

  test('getRetrievability calculates expected retrievability decay', () => {
    expect(engine.getRetrievability(0, 5)).toBe(1)
    expect(engine.getRetrievability(-1, 5)).toBe(1)

    // With stability 10 and elapsed 10, Math.pow(1 + 10/10, -1) = 0.5
    const r = engine.getRetrievability(10, 10)
    expect(r).toBeCloseTo(0.5, 4)
  })

  test('calculateNextWithRetrievability attaches retrievability score', () => {
    const initial = engine.getInitialState()
    const result = engine.calculateNextWithRetrievability(initial, 4)

    expect(typeof result.retrievability).toBe('number')
    expect(result.retrievability).toBeGreaterThanOrEqual(0)
    expect(result.retrievability).toBeLessThanOrEqual(1)
  })

  test('exported reviewEngine singleton is initialized', () => {
    expect(reviewEngine).toBeInstanceOf(ReviewEngine)
  })
})
