import crypto from 'crypto'
import { getAnswerTexts } from './array-utils'

export function normalizeTextAST(text: string): string {
  if (typeof text !== 'string') return ''

  const normalized = text
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/gi, (_, entity) => {
      const entMap: Record<string, string> = {
        nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'"
      }
      return entMap[entity.toLowerCase()] || ' '
    })
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/[“”«»‟]/g, '"')
    .replace(/[‘’`′]/g, "'")
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\r\n\t\f\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\s]+/g, ' ')
    .trim()
    .replace(/^(?:question\s+\d+|câu\s+\d+|cau\s+\d+|q\d+)[:.]\s*/gi, '')
    .replace(/^(?:\[[a-z0-9]+\]|\([a-z0-9]+\)|[a-z][.\):/-]|\d+[.\):/-](?!\d))\s*/gi, '')
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

export interface QuestionASTInput {
  text: string
  options: string[]
  correct_answer: number | number[]
  language?: string
  question_type?: string
  topic?: string
}

export function generateCanonicalQuestionHash(q: QuestionASTInput): string {
  const normalizedText = normalizeTextAST(q.text)
  const normalizedOptions = (q.options || [])
    .map(normalizeOptionAST)
    .sort((a, b) => a.localeCompare(b))

  const canonicalAnswerTexts = getAnswerTexts(q.options || [], q.correct_answer)
    .map(normalizeOptionAST)
    .sort((a, b) => a.localeCompare(b))

  const payload = {
    lang: (q.language || 'unknown').toLowerCase().trim(),
    text: normalizedText,
    opts: normalizedOptions,
    ans: canonicalAnswerTexts,
    type: (q.question_type || 'single_choice').toLowerCase().trim(),
    topic: (q.topic || '').toLowerCase().trim(),
  }

  const hash = crypto.createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex')
  return `ast_${hash.substring(0, 20)}`
}
