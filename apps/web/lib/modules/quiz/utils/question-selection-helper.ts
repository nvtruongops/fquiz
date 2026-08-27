/**
 * Helper to compute the required answer selection count for a question.
 * Combines explicit correct_answer length with text pattern matching
 * (e.g., "(Choose two.)", "(Choose 2)", "(Select two)", "(Chọn 2 đáp án)", etc.).
 */
export function getAnswerSelectionCount(question: {
  text?: string
  correct_answer?: unknown
  options?: unknown[]
}): number {
  if (!question) return 1

  const optionsLength = Array.isArray(question.options) ? Math.max(question.options.length, 2) : 4

  // 1. Calculate from correct_answer array length if available
  let countFromAnswer = 1
  if (Array.isArray(question.correct_answer)) {
    countFromAnswer = question.correct_answer.length
  } else if (typeof question.correct_answer === 'number') {
    countFromAnswer = 1
  }

  // 2. Infer from question text patterns
  let countFromText = 0
  if (question.text && typeof question.text === 'string') {
    const text = question.text
    const numberWordsMap: Record<string, number> = {
      one: 1, '1': 1, một: 1,
      two: 2, '2': 2, hai: 2,
      three: 3, '3': 3, ba: 3,
      four: 4, '4': 4, bốn: 4,
      five: 5, '5': 5, năm: 5,
      six: 6, '6': 6, sáu: 6,
    }
    /* eslint-disable security/detect-unsafe-regex */
    const match =
      text.match(/\((?:choose|select|chọn)\s+(two|three|four|five|six|\d+)(?:\s+answers?|\s+options?|\s+đáp\s+án)?\.?\)/i) ||
      text.match(/\b(?:choose|select|chọn)\s+(two|three|four|five|six|\d+)(?!\s*-\s*[a-z])\s*(?:answers?|options?|đáp\s+án|\.|\$|\b)/i)
    /* eslint-enable security/detect-unsafe-regex */

    if (match && match[1]) {
      const val = match[1].toLowerCase()
      /* eslint-disable security/detect-object-injection */
      const parsedNum = numberWordsMap[val] ?? (Number.parseInt(val, 10) || 0)
      /* eslint-enable security/detect-object-injection */
      if (parsedNum >= 1 && parsedNum <= 10) {
        countFromText = parsedNum
      }
    }
  }

  const effectiveCount = Math.max(countFromAnswer, countFromText, 1)
  return Math.min(effectiveCount, optionsLength)
}
