import crypto from 'crypto'

export function normalizeTextAST(text: string): string {
  if (typeof text !== 'string') return ''

  let normalized = text
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/gi, (_, entity) => {
      const entMap: Record<string, string> = {
        nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'",
      }
      return entMap[entity.toLowerCase()] || ' '
    })
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/[“”«»‟]/g, '"')
    .replace(/[‘’`′]/g, "'")
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\r\n\t\f\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\s]+/g, ' ')
    .trim()

  // Remove common question prefixes iteratively
  let prev = ''
  while (prev !== normalized) {
    prev = normalized
    normalized = normalized
      .replace(/^(?:câu\s*hỏi|cau\s*hoi|câu\s*\d+|cau\s*\d+|question\s*\d+|question|q\d+|bài\s*\d+)[:.]\s*/gi, '')
      .replace(/^(?:\[[a-z0-9]+\]|\([a-z0-9]+\)|[a-z][.\):/-]|\d+[.\):/-](?!\d))\s*/gi, '')
      .replace(/^(?:câu\s*hỏi|cau\s*hoi|question)[:.]\s*/gi, '')
      .trim()
  }

  normalized = normalized
    .replace(/\s+([?.!,:;])/g, '$1')
    .replace(/^[.?!:,;\s]+|[.?!:,;\s]+$/g, '')
    .trim()

  return normalized || text.trim().toLowerCase()
}

export function normalizeOptionAST(opt: string): string {
  let s = normalizeTextAST(opt)
  if (!s) return ''
  if (/^(?:a|an|the)$/i.test(s)) return s
  const stripped = s.replace(/^(?:a|an|the)\s+/i, '')
  s = stripped.length > 0 ? stripped : s
  s = s.replace(/^[.?!:,;\s]+|[.?!:,;\s]+$/g, '').trim()
  return s
}

export function hasOptionOverlap(opts1: string[], opts2: string[]): boolean {
  if (!opts1 || !opts2 || opts1.length === 0 || opts2.length === 0) return false
  const set2 = new Set(opts2.map((o) => normalizeOptionAST(o)).filter(Boolean))
  let matches = 0
  for (const o of opts1) {
    const norm = normalizeOptionAST(o)
    if (norm && set2.has(norm)) matches++
  }
  return matches >= 1 || matches / Math.max(opts1.length, opts2.length) >= 0.3
}

export function generateQuestionId(question: {
  text: string
  options: string[]
}): string {
  const normalizedText = normalizeTextAST(question.text)
  const normalizedOptions = question.options
    .map((o) => normalizeOptionAST(o))
    .sort((a, b) => a.localeCompare(b))

  const content = JSON.stringify({
    text: normalizedText,
    options: normalizedOptions,
  })

  const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex')
  return `q_${hash.substring(0, 16)}`
}

export function getAnswerTexts(options: string[], answerIndices: number | number[]): string[] {
  if (!options || !Array.isArray(options)) return []
  const indexes = Array.isArray(answerIndices) ? answerIndices : [answerIndices]
  return indexes
    .map((idx) => options[idx]?.trim().toLowerCase().replace(/[.,;!?]+$/g, '').replace(/\s+/g, ' ') ?? '')
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
