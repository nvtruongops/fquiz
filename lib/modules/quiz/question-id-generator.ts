import crypto from 'crypto'

/**
 * CHIẾN LƯỢC HASH TỐI ƯU: text + sorted options
 * 
 * Phân tích các trường hợp:
 * 
 * 1. Hash(text only):
 *    - Câu hỏi giống, options khác hoàn toàn → CÙNG ID → không phát hiện conflict ❌
 * 
 * 2. Hash(text + answers):
 *    - Câu hỏi giống, đáp án [A,B] vs [A] → KHÁC ID → bỏ sót conflict ❌
 * 
 * 3. Hash(text + sorted_options) ← CHỌN CÁCH NÀY:
 *    - Câu hỏi giống, options giống, answers khác → CÙNG ID → phát hiện conflict ✅
 *    - Câu hỏi giống, options khác → KHÁC ID → coi là câu hỏi khác ✅ (hợp lý vì options là một phần của câu hỏi)
 *    - Thứ tự options không quan trọng (sort trước khi hash) ✅
 * 
 * Conflict detection (Layer 2):
 *    - So sánh answer TEXTS (không phải indices) để tránh lỗi khi options bị đổi thứ tự
 *    - [0] với options=[A,B,C] vs [1] với options=[B,A,C] → cùng answer text "A" → KHÔNG conflict ✅
 */
export function generateQuestionId(question: {
  text: string
  options: string[]
  correct_answer?: number[]
}): string {
  const normalizedText = question.text.trim().toLowerCase().replace(/\s+/g, ' ')
  
  // Sort options để thứ tự không quan trọng
  const normalizedOptions = question.options
    .map(o => o.trim().toLowerCase().replace(/\s+/g, ' '))
    .sort()
  
  const content = JSON.stringify({
    text: normalizedText,
    options: normalizedOptions,
    // KHÔNG bao gồm answers trong hash
    // → Cùng câu hỏi + cùng options nhưng khác answers → CÙNG ID → phát hiện conflict
  })
  
  const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex')
  return `q_${hash.substring(0, 16)}`
}

/**
 * So sánh đáp án theo NỘI DUNG TEXT (không phải index)
 * Tránh false conflict khi options bị đổi thứ tự giữa các quiz
 * 
 * Ví dụ:
 * Quiz A: options=["Đúng","Sai","Không biết"], answer=[0] → answer text = "Đúng"
 * Quiz B: options=["Sai","Đúng","Không biết"], answer=[1] → answer text = "Đúng"
 * → CÙNG đáp án (không conflict) ✅
 */
export function getAnswerTexts(options: string[], answerIndices: number[]): string[] {
  return answerIndices
    .map(idx => options[idx]?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '')
    .filter(Boolean)
    .sort()
}

export function areAnswersSame(
  q1: { options: string[]; correct_answer: number[] },
  q2: { options: string[]; correct_answer: number[] }
): boolean {
  const texts1 = getAnswerTexts(q1.options, q1.correct_answer)
  const texts2 = getAnswerTexts(q2.options, q2.correct_answer)
  
  if (texts1.length !== texts2.length) return false
  return texts1.every((t, i) => t === texts2[i])
}

/**
 * Check if two questions are duplicates based on content
 */
export function areQuestionsDuplicate(
  q1: { text: string; options: string[]; correct_answer: number[] },
  q2: { text: string; options: string[]; correct_answer: number[] }
): boolean {
  return generateQuestionId(q1) === generateQuestionId(q2)
}

/**
 * Find duplicate questions within an array
 * Returns map of question_id -> array of indices
 */
export function findDuplicateQuestions(
  questions: Array<{ text: string; options: string[]; correct_answer: number[] }>
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
