const answerCountWords = new Map<string, number>([
  ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5], ['six', 6],
  ['1', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6],
  ['một', 1], ['hai', 2], ['ba', 3], ['bốn', 4], ['năm', 5], ['sáu', 6],
])

/** Infer only explicit answer instructions, never a count of subjects in the prompt. */
function parseAnswerCountToken(token: string): number | null {
  const count = answerCountWords.get(token.toLowerCase())
  if (count) return count
  return /^(?:[1-9]|10)$/.test(token) ? Number(token) : null
}

function hasAnswerInstructionTail(tail: string): boolean {
  const namesAnswers = /^\s*(?:answers?|options?|responses?|đáp\s+án|câu\s+trả\s+lời)(?=\s|[.)!?:;]|$)/iu.test(tail)
  const isBareInstruction = /^\s*(?:[.)!?:;]|$)/u.test(tail) && !/^\.\d/u.test(tail)
  return namesAnswers || isBareInstruction
}

export function getExplicitAnswerSelectionCount(text?: string): number | null {
  if (!text) return null
  const instructions = /(?:^|[^\p{L}\p{N}])(?:choose|select|chọn)\s+([\p{L}\p{N}]+)(?=\s|[.)!?:;]|$)/giu
  for (const match of text.matchAll(instructions)) {
    const count = parseAnswerCountToken(match[1])
    if (count === null) continue
    const tail = text.slice((match.index ?? 0) + match[0].length)
    if (hasAnswerInstructionTail(tail)) return count
  }
  return null
}
