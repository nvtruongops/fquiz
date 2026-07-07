/**
 * Shared Array Utilities for Quiz Platform
 * Centralizes normalization and comparison logic to avoid duplication
 */

/**
 * Normalizes an array of numbers by removing duplicates and sorting in ascending order.
 * Used for answer comparison, question ID generation, and score calculation.
 * 
 * @example
 * normalizeIndexes([2, 1, 2, 3]) // [1, 2, 3]
 * normalizeIndexes([0]) // [0]
 * normalizeIndexes([]) // []
 */
export function normalizeIndexes(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b)
}

/**
 * Ensures input is always an array.
 * Converts single values to single-element arrays.
 * 
 * @example
 * ensureArray(1) // [1]
 * ensureArray([1, 2]) // [1, 2]
 */
export function ensureArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

/**
 * Compares two sorted arrays for exact equality (length + element-wise comparison).
 * Both arrays MUST be pre-sorted and deduplicated via normalizeIndexes().
 * 
 * @example
 * isExactArrayMatch([1, 2], [1, 2]) // true
 * isExactArrayMatch([1, 2], [2, 1]) // false (caller must sort first)
 * isExactArrayMatch([1], [1, 2]) // false
 */
export function isExactArrayMatch(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Maps answer indices to their corresponding option texts.
 * Normalizes text by trimming, lowercasing, and collapsing whitespace.
 * Used for text-based answer comparison (index-agnostic).
 * 
 * @example
 * getAnswerTexts(['A', 'B', 'C'], [0, 2]) // ['a', 'c']
 * getAnswerTexts(['True', 'False'], 1) // ['false']
 */
export function getAnswerTexts(options: string[], answerIndices: number | number[]): string[] {
  return ensureArray(answerIndices)
    .map(idx => options[idx]?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '')
    .filter(Boolean)
    .sort()
}

/**
 * Compares two sets of answer indices by their TEXT content (not index position).
 * Returns true if both questions have the same correct answer texts.
 * 
 * This avoids false conflicts when option order differs between quizzes:
 * - Quiz A: options=["True","False"], answer=[0] → "true"
 * - Quiz B: options=["False","True"], answer=[1] → "true"
 * - Result: true (same answer despite different index)
 * 
 * @example
 * areAnswersSame(
 *   { options: ['A', 'B'], correct_answer: [0] },
 *   { options: ['B', 'A'], correct_answer: [1] }
 * ) // true (both point to 'A')
 */
export function areAnswersSame(
  q1: { options: string[]; correct_answer: number | number[] },
  q2: { options: string[]; correct_answer: number | number[] }
): boolean {
  const texts1 = getAnswerTexts(q1.options, q1.correct_answer)
  const texts2 = getAnswerTexts(q2.options, q2.correct_answer)
  
  if (texts1.length !== texts2.length) return false
  return texts1.every((t, i) => t === texts2[i])
}
