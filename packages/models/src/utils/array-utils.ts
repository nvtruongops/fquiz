export function normalizeIndexes(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b)
}

export function ensureArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

export function isExactArrayMatch(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export function getAnswerTexts(options: string[], answerIndices: number | number[]): string[] {
  return ensureArray(answerIndices)
    .map(idx => options[idx]?.trim().toLowerCase().replace(/[.,;!?]+$/g, '').replace(/\s+/g, ' ') ?? '')
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
}

export function areAnswersSame(
  q1: { options: string[]; correct_answer: number | number[] },
  q2: { options: string[]; correct_answer: number | number[] }
): boolean {
  const texts1 = getAnswerTexts(q1.options, q1.correct_answer)
  const texts2 = getAnswerTexts(q2.options, q2.correct_answer)
  
  if (texts1.length !== texts2.length) return false
  return texts1.every((t, i) => t === texts2[i])
}
