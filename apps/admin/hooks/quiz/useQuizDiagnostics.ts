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
      errors.push({ message: 'Vui lòng chọn Môn học trước' })
    }
    if (!courseCode.trim()) {
      errors.push({ message: 'Chưa nhập Mã đề thi (Quiz Code)' })
    } else if (codeDuplicateInfo?.exists) {
      errors.push({ message: `Mã đề ${courseCode.toUpperCase()} đã tồn tại trong hệ thống` })
    }

    const seenQuestionMap = new Map<string, number>()
    questions.forEach((q, i) => {
      let isQValid = true
      if (!q.text.trim()) {
        errors.push({ message: 'Chưa nhập nội dung câu hỏi', questionIndex: i })
        isQValid = false
      }
      const nonEmptyOptions = q.options.filter((o) => o.trim())
      if (nonEmptyOptions.length < 2) {
        errors.push({ message: 'Cần ít nhất 2 phương án trả lời', questionIndex: i })
        isQValid = false
      }
      if (!q.correct_answer || q.correct_answer.length === 0) {
        errors.push({ message: 'Chưa chọn đáp án đúng', questionIndex: i })
        isQValid = false
      }

      if (q.text.trim() && nonEmptyOptions.length >= 2) {
        const qHash = generateQuestionId(q)
        if (seenQuestionMap.has(qHash)) {
          const firstIndex = seenQuestionMap.get(qHash)!
          errors.push({
            message: `Trùng nội dung & đáp án với Câu ${firstIndex + 1}`,
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
