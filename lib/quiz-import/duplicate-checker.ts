import { generateQuestionId, findDuplicateQuestions } from '@/lib/question-id-generator'
import type { NormalizedQuestion, ImportDiagnostic } from './types'

/**
 * Check for duplicate questions in imported quiz
 * Returns diagnostics for duplicates found
 */
export function checkDuplicateQuestions(
  questions: NormalizedQuestion[]
): ImportDiagnostic[] {
  const diagnostics: ImportDiagnostic[] = []
  
  // Find duplicates within the quiz
  const duplicates = findDuplicateQuestions(
    questions.map(q => ({
      text: q.text,
      options: q.options,
      correct_answer: q.correct_answer
    }))
  )
  
  if (duplicates.size > 0) {
    duplicates.forEach((indices, questionId) => {
      const firstIndex = indices[0]
      const duplicateIndices = indices.slice(1)
      
      diagnostics.push({
        level: 'warning',
        code: 'DUPLICATE_QUESTION',
        message: `Câu hỏi ${firstIndex + 1} bị trùng lặp ở vị trí: ${duplicateIndices.map(i => i + 1).join(', ')}`,
        questionIndex: firstIndex,
        field: `questions[${firstIndex}]`,
        metadata: {
          questionId,
          duplicateIndices
        }
      })
    })
  }
  
  return diagnostics
}

/**
 * Add question_id to normalized questions
 */
export function addQuestionIds(
  questions: NormalizedQuestion[]
): Array<NormalizedQuestion & { question_id: string }> {
  return questions.map(q => ({
    ...q,
    question_id: generateQuestionId({
      text: q.text,
      options: q.options,
      correct_answer: q.correct_answer
    })
  }))
}
