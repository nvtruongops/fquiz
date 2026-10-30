const answerCountWords = new Map<string, number>([
  ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5], ['six', 6],
  ['1', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6],
  ['một', 1], ['hai', 2], ['ba', 3], ['bốn', 4], ['năm', 5], ['sáu', 6],
])

/** Returns the explicitly requested number of answers in question text, if present. */
export function getExplicitAnswerSelectionCount(text?: string): number | null {
  if (!text) return null

  const tokens = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  for (let index = 0; index < tokens.length - 1; index++) {
    const count = countAfterSelectionMarker(tokens, index) ?? countAfterQuestionWord(tokens, index)
    if (count !== null) return count
  }

  return null
}

function parseAnswerCount(token?: string): number | null {
  if (!token) return null
  const count = answerCountWords.get(token) ?? Number.parseInt(token, 10)
  return Number.isInteger(count) && count >= 1 && count <= 10 ? count : null
}

function countAfterSelectionMarker(tokens: string[], index: number): number | null {
  const marker = tokens[index]
  if (marker !== 'choose' && marker !== 'select' && marker !== 'chọn') return null
  return parseAnswerCount(tokens[index + 1])
}

function countAfterQuestionWord(tokens: string[], index: number): number | null {
  const marker = tokens[index]
  if (marker !== 'which' && marker !== 'what') return null

  let countIndex = index + 1
  if (tokens[countIndex] === 'are') countIndex++
  if (tokens[countIndex] === 'the') countIndex++
  return parseAnswerCount(tokens[countIndex])
}
