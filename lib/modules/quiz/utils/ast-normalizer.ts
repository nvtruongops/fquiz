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

  return text
    // 1. Lowercase
    .toLowerCase()
    // 2. Strip HTML tags
    .replace(/<[^>]*>/g, ' ')
    // 3. Collapse whitespace and trim FIRST so trailing spaces don't hide trailing punctuation
    .replace(/\s+/g, ' ')
    .trim()
    // 4. Strip option prefixes (a. , b) , [c] , 1. )
    .replace(/^(?:\[[a-z0-9]\]|[a-z0-9][.\):])\s*/g, '')
    // 5. Normalize punctuation before spaces (e.g. " ?" -> "?")
    .replace(/\s+([?.!,:;])/g, '$1')
    // 6. Strip trailing punctuation (trailing periods, colons, commas, question/exclamation marks)
    .replace(/[.?!:,;]+$/g, '')
    .trim()
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
 * - Leading option letter prefixes ("A. ", "B. ")
 */
export function generateCanonicalQuestionHash(q: QuestionASTInput): string {
  const normalizedText = normalizeTextAST(q.text)
  const normalizedOptions = (q.options || [])
    .map(normalizeTextAST)
    .sort((a, b) => a.localeCompare(b))

  // Extract normalized answer TEXTS rather than raw option indices.
  // This makes fingerprint immune to option shuffling!
  const canonicalAnswerTexts = getAnswerTexts(q.options || [], q.correct_answer)
    .map(normalizeTextAST)
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
