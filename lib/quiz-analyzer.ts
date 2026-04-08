import { CreateQuizInput } from './schemas'

export type ValidationErrorSeverity = 'error' | 'warning'

export type ValidationErrorCode = 
  | 'MISSING_TITLE'
  | 'MISSING_CATEGORY'
  | 'MISSING_COURSE_CODE'
  | 'MISSING_TEXT'
  | 'NO_CORRECT_ANSWER'
  | 'TARGET_MISMATCH'
  | 'EMPTY_OPTION'

export interface ValidationError {
  code: ValidationErrorCode
  severity: ValidationErrorSeverity
  message: string
  questionIndex?: number // 0-based index
}

export interface QuizDiagnostics {
  isValid: boolean
  progressPercent: number
  errors: ValidationError[]
  warnings: ValidationError[]
  summary: {
    totalQuestions: number
    completedQuestions: number
    targetQuestions: number
    missingTextCount: number
    missingAnswerCount: number
    emptyOptionsCount: number
  }
}

/**
 * Enterprise-Grade Quiz Completeness Analyzer
 * 
 * Performs deep scan of quiz data and returns a structured diagnostic report.
 * Uses an extensible rule system for future-proof validation.
 */
export function analyzeQuizCompleteness(data: any, targetCount: number = 0): QuizDiagnostics {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  
  const summary = {
    totalQuestions: data.questions?.length || 0,
    completedQuestions: 0,
    targetQuestions: targetCount,
    missingTextCount: 0,
    missingAnswerCount: 0,
    emptyOptionsCount: 0,
  }

  // 1. Basic Metadata Rules
  if (!data.title?.trim()) {
    errors.push({ code: 'MISSING_TITLE', severity: 'error', message: 'Thiếu tiêu đề quiz' })
  }
  if (!data.category_id) {
    errors.push({ code: 'MISSING_CATEGORY', severity: 'error', message: 'Chưa chọn môn học' })
  }
  if (!data.course_code?.trim()) {
    errors.push({ code: 'MISSING_COURSE_CODE', severity: 'error', message: 'Chưa nhập mã đề / Mã Quiz' })
  }

  // 2. Question Rules
  const questions = data.questions || []
  questions.forEach((q: any, i: number) => {
    let isQComplete = true

    // Text Check
    if (!q.text?.trim()) {
      errors.push({ code: 'MISSING_TEXT', severity: 'error', message: `Câu ${i + 1}: chưa nhập nội dung`, questionIndex: i })
      summary.missingTextCount++
      isQComplete = false
    }

    // Check for "holes" (empty options between non-empty ones)
    // Only if we have at least one non-empty option
    const filteredOptions = (q.options || []).map((o: string) => o.trim()).filter((o: string) => o !== '')
    const rawOptions = q.options || []

    if (filteredOptions.length > 0) {
      let foundEmpty = false
      let foundContentAfterEmpty = false
      
      for (let j = 0; j < rawOptions.length; j++) {
        const trimmed = rawOptions[j].trim()
        if (trimmed === '') {
          foundEmpty = true
        } else if (foundEmpty) {
          foundContentAfterEmpty = true
          break
        }
      }

      if (foundContentAfterEmpty) {
        errors.push({ code: 'EMPTY_OPTION', severity: 'error', message: `Câu ${i + 1}: đáp án không được để trống ở giữa`, questionIndex: i })
        summary.emptyOptionsCount++
        isQComplete = false
      }
    }

    // Correct Answer Check - handle both singular and plural naming
    const correctAnswers = q.correct_answer || q.correct_answers || []
    if (correctAnswers.length === 0) {
      errors.push({ code: 'NO_CORRECT_ANSWER', severity: 'error', message: `Câu ${i + 1}: chưa chọn đáp án đúng`, questionIndex: i })
      summary.missingAnswerCount++
      isQComplete = false
    }

    if (isQComplete) {
      summary.completedQuestions++
    }
  })

  // 3. Target Count Rule
  if (summary.totalQuestions < targetCount) {
    errors.push({ 
      code: 'TARGET_MISMATCH', 
      severity: 'error', 
      message: `Chưa đủ số lượng câu hỏi mục tiêu (${summary.totalQuestions}/${targetCount})` 
    })
  } else if (summary.totalQuestions > targetCount && targetCount > 0) {
     warnings.push({
       code: 'TARGET_MISMATCH',
       severity: 'warning',
       message: `Số câu hỏi (${summary.totalQuestions}) đang vượt mục tiêu (${targetCount})`
     })
  }

  // 4. Final Aggregation
  // Stable sorting of errors: by index (asc), then by code
  errors.sort((a, b) => {
    const idxA = a.questionIndex ?? -1
    const idxB = b.questionIndex ?? -1
    if (idxA !== idxB) return idxA - idxB
    return a.code.localeCompare(b.code)
  })

  const isValid = errors.length === 0
  const progressPercent = targetCount > 0 
    ? Math.min(100, Math.round((summary.completedQuestions / targetCount) * 100))
    : summary.totalQuestions > 0 ? 100 : 0

  return {
    isValid,
    progressPercent,
    errors,
    warnings,
    summary
  }
}
