import { secureShuffle } from '../shuffle'

describe('secureShuffle', () => {
  it('should return an array of the same length', () => {
    const result = secureShuffle([1, 2, 3, 4, 5])
    expect(result).toHaveLength(5)
  })

  it('should contain all original elements', () => {
    const original = [1, 2, 3, 4, 5]
    const result = secureShuffle(original)
    expect(result.sort()).toEqual(original.sort())
  })

  it('should not mutate the original array', () => {
    const original = [1, 2, 3, 4, 5]
    const originalCopy = [...original]
    secureShuffle(original)
    expect(original).toEqual(originalCopy)
  })

  it('should handle empty array', () => {
    expect(secureShuffle([])).toEqual([])
  })

  it('should handle single element array', () => {
    expect(secureShuffle([42])).toEqual([42])
  })

  it('should produce different orderings (probabilistic)', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    // Run multiple shuffles and check that at least one is different from original
    const results = Array.from({ length: 10 }, () => secureShuffle(arr))
    const allSame = results.every(r => r.every((v, i) => v === arr[i]))
    expect(allSame).toBe(false)
  })
})
