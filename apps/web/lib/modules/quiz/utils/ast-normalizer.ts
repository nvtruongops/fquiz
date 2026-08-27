import crypto from 'crypto'
import { getAnswerTexts } from '@/lib/core/utils/array-utils'

/**
 * AST-style text normalizer for Quiz and Question content matching.
 * Handles:
 * - HTML tag stripping (<p>, <span>, <br>, etc.)
 * - Option label prefix removal (A. , B) , [C] , 1. )
 * - Trailing/duplicate punctuation normalization (. , : ? !)
 * - Whitespace collapsing and case normalization
 */
export function normalizeTextAST(text: string): string {
  if (typeof text !== 'string') return ''

  const normalized = text
    // 1. Lowercase
    .toLowerCase()
    // 2. Strip HTML tags first to prevent unescape-then-strip bypasses
    .replace(/<[^>]*>/g, ' ')
    // 3. Decode HTML entities in a single-pass lookup map
    .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/gi, (_, entity) => {
      const entMap: Record<string, string> = {
        nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'"
      }
      return entMap[entity.toLowerCase()] || ' '
    })
    .replace(/&[a-z0-9#]+;/gi, ' ')
    // 4. Normalize quotes and zero-width spaces
    .replace(/[“”«»‟]/g, '"')
    .replace(/[‘’`′]/g, "'")
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // 5. Collapse all whitespace characters (\n, \r, \t, \u00a0, etc.)
    .replace(/[\r\n\t\f\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\s]+/g, ' ')
    .trim()
    // 6. Strip Question prefixes (e.g. "Question 1:", "Câu 1:", "Q1:") if non-empty remainder
    .replace(/^(?:question\s+\d+|câu\s+\d+|cau\s+\d+|q\d+)[:.]\s*/gi, '')
    // 7. Strip Option label prefixes (A. , B) , [C] , 1. , (A) , A- , A: , A/ )
    .replace(/^(?:\[[a-z0-9]+\]|\([a-z0-9]+\)|[a-z][.\):/-]|\d+[.\):/-](?!\d))\s*/gi, '')
    // 8. Normalize punctuation before spaces (e.g. " ?" -> "?")
    .replace(/\s+([?.!,:;])/g, '$1')
    // 9. Strip leading & trailing punctuation & whitespace
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

/**
 * Generates a canonical, AST-normalized fingerprint for a question.
 * Immune to:
 * - Trailing period / punctuation differences ("..." vs "..")
 * - HTML tag wrappers (<p>...</p>)
 * - Option order permutations (shuffled options with adjusted correct_answer)
 * - Leading option letter prefixes ("A. ", "B. ", "(A)", "1)")
 * - HTML entity differences (&nbsp;, &amp;)
 */
export function generateCanonicalQuestionHash(q: QuestionASTInput): string {
  const normalizedText = normalizeTextAST(q.text)
  const normalizedOptions = (q.options || [])
    .map(normalizeOptionAST)
    .sort((a, b) => a.localeCompare(b))

  // Extract normalized answer TEXTS rather than raw option indices.
  // This makes fingerprint immune to option shuffling!
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
