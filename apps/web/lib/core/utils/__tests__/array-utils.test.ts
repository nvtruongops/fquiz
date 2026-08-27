import { normalizeIndexes, ensureArray, isExactArrayMatch, getAnswerTexts, areAnswersSame } from '../array-utils'

describe('normalizeIndexes', () => {
  it('should sort and deduplicate', () => {
    expect(normalizeIndexes([2, 1, 2, 3])).toEqual([1, 2, 3])
    expect(normalizeIndexes([0])).toEqual([0])
    expect(normalizeIndexes([])).toEqual([])
  })
  it('should handle negative numbers', () => {
    expect(normalizeIndexes([-1, 0, -1])).toEqual([-1, 0])
  })
})

describe('ensureArray', () => {
  it('should wrap single value in array', () => {
    expect(ensureArray(1)).toEqual([1])
    expect(ensureArray('x')).toEqual(['x'])
  })
  it('should return array unchanged', () => {
    expect(ensureArray([1, 2])).toEqual([1, 2])
  })
})

describe('isExactArrayMatch', () => {
  it('should match equal sorted arrays', () => {
    expect(isExactArrayMatch([1, 2], [1, 2])).toBe(true)
    expect(isExactArrayMatch([], [])).toBe(true)
  })
  it('should reject different arrays', () => {
    expect(isExactArrayMatch([1, 2], [2, 1])).toBe(false)
    expect(isExactArrayMatch([1], [1, 2])).toBe(false)
    expect(isExactArrayMatch([1], [2])).toBe(false)
  })
})

describe('getAnswerTexts', () => {
  it('should map indices to normalized option texts', () => {
    expect(getAnswerTexts(['A', 'B', 'C'], [0, 2])).toEqual(['a', 'c'])
    expect(getAnswerTexts(['True', 'False'], 1)).toEqual(['false'])
  })
  it('should handle empty/invalid indices', () => {
    expect(getAnswerTexts(['A'], [99])).toEqual([])
    expect(getAnswerTexts([], [0])).toEqual([])
  })
})

describe('areAnswersSame', () => {
  it('should detect same answers regardless of index', () => {
    const r = areAnswersSame(
      { options: ['A', 'B'], correct_answer: [0] },
      { options: ['B', 'A'], correct_answer: [1] }
    )
    expect(r).toBe(true)
  })
  it('should detect different answers', () => {
    const r = areAnswersSame(
      { options: ['A', 'B'], correct_answer: [0] },
      { options: ['A', 'B'], correct_answer: [1] }
    )
    expect(r).toBe(false)
  })
  it('should handle different answer counts', () => {
    const r = areAnswersSame(
      { options: ['A', 'B', 'C'], correct_answer: [0] },
      { options: ['A', 'B', 'C'], correct_answer: [0, 1] }
    )
    expect(r).toBe(false)
  })
})
