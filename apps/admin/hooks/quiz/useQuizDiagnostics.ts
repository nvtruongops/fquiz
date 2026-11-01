import { useMemo } from 'react'
import { generateQuestionId } from '@/lib/utils/question-id'
import type { QuestionItem, QuizDiagnostics, QuizDiagnosticError } from './types'

interface UseQuizDiagnosticsProps {
  questions: QuestionItem[]
  courseCode: string
  categoryId: string
  codeDuplicateInfo: { exists: boolean } | null
}

export function useQuizDiagnostics({
  questions,
  courseCode,
  categoryId,
  codeDuplicateInfo,
}: UseQuizDiagnosticsProps): QuizDiagnostics {
  return useMemo(() => {
    const total = questions.length
    let completed = 0
    const errors: QuizDiagnosticError[] = []

    if (!categoryId) {
      errors.push({ code: 'MISSING_CATEGORY', message: 'Please select a subject/category first' })
    }
    if (!courseCode.trim()) {
      errors.push({ code: 'MISSING_CODE', message: 'Quiz Code is required' })
    } else if (codeDuplicateInfo?.exists) {
      errors.push({ code: 'DUPLICATE_CODE', message: `Quiz Code ${courseCode.toUpperCase()} already exists in the system` })
    }

    const seenQuestionMap = new Map<string, number>()
    questions.forEach((q, i) => {
      let isQValid = true
      if (!q.text.trim()) {
        errors.push({ code: 'MISSING_QUESTION', message: 'Question content is required', questionIndex: i })
        isQValid = false
      }
      const nonEmptyOptions = q.options.filter((o) => o.trim())
      if (nonEmptyOptions.length < 2) {
        errors.push({ code: 'MISSING_OPTIONS', message: 'At least 2 options are required', questionIndex: i })
        isQValid = false
      }
      if (!q.correct_answer || q.correct_answer.length === 0) {
        errors.push({ code: 'MISSING_ANSWER', message: 'Correct answer must be selected', questionIndex: i })
        isQValid = false
      }

      if (q.text.trim() && nonEmptyOptions.length >= 2) {
        const qHash = generateQuestionId(q)
        if (seenQuestionMap.has(qHash)) {
          const firstIndex = seenQuestionMap.get(qHash)!
          errors.push({
            code: 'DUPLICATE_QUESTION',
            message: `Duplicate content & answer with Question ${firstIndex + 1}`,
            questionIndex: i,
          })
          isQValid = false
        } else {
          seenQuestionMap.set(qHash, i)
        }
      }

      if (isQValid) completed++
    })

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return {
      total,
      completed,
      percent,
      errors,
      isValid: errors.length === 0 && Boolean(categoryId) && Boolean(courseCode.trim()) && !codeDuplicateInfo?.exists,
    }
  }, [questions, courseCode, categoryId, codeDuplicateInfo])
}
