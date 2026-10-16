/**
 * useExamTabLease test in Node environment
 */
import { useExamTabLease } from '../useExamTabLease'

describe('useExamTabLease', () => {
  it('should be defined as a hook function', () => {
    expect(useExamTabLease).toBeDefined()
    expect(typeof useExamTabLease).toBe('function')
  })

  it('exposes a valid hook signature with default parameters', () => {
    expect(useExamTabLease.length).toBeGreaterThanOrEqual(1)
  })
})
