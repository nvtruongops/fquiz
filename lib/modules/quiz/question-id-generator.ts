import crypto from 'crypto'
import { getAnswerTexts, areAnswersSame } from '@/lib/core/utils/array-utils'
import { normalizeTextAST } from '@/lib/modules/quiz/utils/ast-normalizer'


/**
 * CHIẾN LƯỢC HASH CŨ (Conflict Detection): AST-normalized text + sorted options
 * Dùng cho QuestionBank – phát hiện mâu thuẫn đáp án giữa các quiz.
 * KHÔNG bao gồm correct_answer → câu hỏi giống + options giống nhưng đáp án khác → CÙNG ID → conflict.
 */
export function generateQuestionId(question: {
  text: string
  options: string[]
  correct_answer?: number | number[]
}): string {
  const normalizedText = normalizeTextAST(question.text)
  
  // Sort options để thứ tự không quan trọng
  const normalizedOptions = question.options
    .map(o => normalizeTextAST(o))
    .sort((a, b) => a.localeCompare(b))
  
  const content = JSON.stringify({
    text: normalizedText,
    options: normalizedOptions,
  })
  
  const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex')
  return `q_${hash.substring(0, 16)}`
}


/**
 * CHIẾN LƯỢC FINGERPRINT MỚI (Exact Deduplication): language + text + options + correct_answer + type
 *
 * Dùng cho Question collection (Phase 1+) – xác định câu hỏi giống hệt nhau để reuse,
 * không phải để phát hiện conflict. Correct_answer được đưa vào hash để phân biệt:
 * - Cùng câu hỏi + cùng options + khác đáp án → KHÁC fingerprint → tạo mới ✅
 * - Cùng câu hỏi + cùng options + cùng đáp án → CÙNG fingerprint → reuse ✅
 *
 * Forward-compatible: language, question_type, topic được đưa vào fingerprint
 * để chuẩn bị cho Phase 2+ khi Question liên kết với Learning Objects.
 */
export function generateQuestionFingerprint(q: {
  text: string
  options: string[]
  correct_answer: number | number[]
  language?: string
  question_type?: string
  topic?: string
}): string {
  const normalizedText = q.text.trim().toLowerCase().replace(/\s+/g, ' ')
  const normalizedOptions = q.options
    .map((o) => o.trim().toLowerCase().replace(/\s+/g, ' '))
    .sort((a, b) => a.localeCompare(b))
  const answerIndexes = Array.isArray(q.correct_answer)
    ? [...q.correct_answer].sort((a, b) => a - b)
    : [q.correct_answer]

  const payload = {
    lang: (q.language || 'unknown').toLowerCase().trim(),
    text: normalizedText,
    opts: normalizedOptions,
    ans: answerIndexes,
    type: (q.question_type || 'single_choice').toLowerCase().trim(),
    topic: (q.topic || '').toLowerCase().trim(),
  }

  const hash = crypto.createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex')
  return `fp_${hash.substring(0, 20)}`
}

/**
 * Tránh false conflict khi options bị đổi thứ tự giữa các quiz
 * 
 * Ví dụ:
 * Quiz A: options=["Đúng","Sai","Không biết"], answer=[0] → answer text = "Đúng"
 * Quiz B: options=["Sai","Đúng","Không biết"], answer=[1] → answer text = "Đúng"
 * → CÙNG đáp án (không conflict) ✅
 */
export { getAnswerTexts, areAnswersSame }

/**
 * Check if two questions are duplicates based on content
 */
export function areQuestionsDuplicate(
  q1: { text: string; options: string[]; correct_answer: number | number[] },
  q2: { text: string; options: string[]; correct_answer: number | number[] }
): boolean {
  return generateQuestionId(q1) === generateQuestionId(q2)
}

/**
 * Find duplicate questions within an array
 * Returns map of question_id -> array of indices
 */
export function findDuplicateQuestions(
  questions: Array<{ text: string; options: string[]; correct_answer: number | number[] }>
): Map<string, number[]> {
  const idToIndices = new Map<string, number[]>()
  
  questions.forEach((q, index) => {
    const qid = generateQuestionId(q)
    const existing = idToIndices.get(qid) || []
    existing.push(index)
    idToIndices.set(qid, existing)
  })
  
  const duplicates = new Map<string, number[]>()
  idToIndices.forEach((indices, qid) => {
    if (indices.length > 1) {
      duplicates.set(qid, indices)
    }
  })
  
  return duplicates
}
