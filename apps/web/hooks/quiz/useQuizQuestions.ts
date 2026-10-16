'use client'

import { useState, useCallback, useMemo } from 'react'
import type { Category, QuizFormData, QuestionForm } from '@/lib/modules/quiz/types/quiz'
import type { ImportedQuiz } from '@/hooks/quiz/useQuizImport'
import { useQuestionBankWarning } from '@/hooks/quiz/useQuestionBankWarning'
import { analyzeQuestionStructure } from '@/lib/modules/quiz/quiz-import/analyzer'
import { checkDuplicateQuestions } from '@/lib/modules/quiz/quiz-import/duplicate-checker'
import { useToast } from '@/store/shared/toast-store'

const DEFAULT_OPTION_COUNT = 4

export function emptyQuestion(): QuestionForm {
  return {
    text: '',
    options: new Array(DEFAULT_OPTION_COUNT).fill(''),
    correct_answers: [],
    explanation: '',
    image_url: '',
  }
}

interface UseQuizQuestionsOptions {
  form: QuizFormData
  setForm: React.Dispatch<React.SetStateAction<QuizFormData>>
  categories: Category[]
  isStudentMode: boolean
  onConflictsResolved?: () => void
}

export function useQuizQuestions({
  form,
  setForm,
  categories,
  isStudentMode,
  onConflictsResolved,
}: UseQuizQuestionsOptions) {
  const { toast } = useToast()
  const [targetCount, setTargetCount] = useState(form.questions.length)
  const [targetInput, setTargetInput] = useState(String(form.questions.length))

  const [hasImportBlockingErrors, setHasImportBlockingErrors] = useState(false)
  const [importPreviewErrors, setImportPreviewErrors] = useState<Array<{ code: string; message: string; questionIndex?: number }>>([])
  const [showImportPanel, setShowImportPanel] = useState(false)
  const [isImportProcessing, setIsImportProcessing] = useState(false)
  const [appliedStructureReport, setAppliedStructureReport] = useState<any | null>(null)
  const [appliedImportSummary, setAppliedImportSummary] = useState<{
    summary: { totalQuestions: number; validQuestions: number; errors: number; warnings: number }
    isValid: boolean
    sameAnswerCount: number
    differentAnswerCount: number
    diagnostics?: Array<{ level?: 'error' | 'warning'; code?: string; message: string; questionIndex?: number }>
  } | null>(null)

  const { checkQuestionUsage, usageInfo, clearUsageInfo } = useQuestionBankWarning(form.category_id)
  const [showBankWarning, setShowBankWarning] = useState(false)
  const [pendingQuestionUpdate, setPendingQuestionUpdate] = useState<{
    index: number
    field: 'text' | 'explanation' | 'image_url'
    value: string
  } | null>(null)

  const pendingQuestionData = useMemo(() => {
    if (!pendingQuestionUpdate) return null
    const q = form.questions[pendingQuestionUpdate.index]
    return {
      text: pendingQuestionUpdate.field === 'text' ? pendingQuestionUpdate.value : q.text,
      options: q.options,
      correct_answer: q.correct_answers,
      explanation: pendingQuestionUpdate.field === 'explanation' ? pendingQuestionUpdate.value : q.explanation,
      image_url: pendingQuestionUpdate.field === 'image_url' ? pendingQuestionUpdate.value : q.image_url,
    }
  }, [pendingQuestionUpdate, form.questions])

  function applyTargetCount(raw: string) {
    const maxCount = isStudentMode ? 150 : 9999
    const n = Math.max(1, Math.min(maxCount, Number.parseInt(raw, 10) || 1))
    setTargetCount(n)
    setTargetInput(String(n))
    setForm((prev) => {
      const cur = prev.questions.length
      if (n > cur) return { ...prev, questions: [...prev.questions, ...Array.from({ length: n - cur }, emptyQuestion)] }
      if (n < cur) return { ...prev, questions: prev.questions.slice(0, n) }
      return prev
    })
  }

  const addQuestion = () =>
    setForm((prev) => ({ ...prev, questions: [...prev.questions, emptyQuestion()] }))

  const removeQuestion = (qi: number) => {
    setForm((prev) => {
      if (prev.questions.length <= 1) return prev
      const next = prev.questions.filter((_, i) => i !== qi)
      setTargetCount(next.length)
      setTargetInput(String(next.length))
      return { ...prev, questions: next }
    })
  }

  const updateOption = (qi: number, oi: number, value: string) =>
    setForm((prev) => {
      const questions = [...prev.questions]
      const options = [...questions[qi].options]
      options[oi] = value
      questions[qi] = { ...questions[qi], options }
      return { ...prev, questions }
    })

  const addOption = (qi: number) =>
    setForm((prev) => {
      const questions = [...prev.questions]
      if (questions[qi].options.length >= 6) return prev
      questions[qi] = { ...questions[qi], options: [...questions[qi].options, ''] }
      return { ...prev, questions }
    })

  const removeOption = (qi: number, oi: number) =>
    setForm((prev) => {
      const questions = [...prev.questions]
      if (questions[qi].options.length <= 2) return prev
      const options = questions[qi].options.filter((_, i) => i !== oi)
      const correct_answers = questions[qi].correct_answers
        .filter((a) => a !== oi)
        .map((a) => (a > oi ? a - 1 : a))
      questions[qi] = { ...questions[qi], options, correct_answers }
      return { ...prev, questions }
    })

  const toggleCorrect = (qi: number, oi: number) =>
    setForm((prev) => {
      const questions = [...prev.questions]
      const q = questions[qi]
      const already = q.correct_answers.includes(oi)
      const correct_answers = already
        ? q.correct_answers.filter((a) => a !== oi)
        : [...q.correct_answers, oi].sort((a, b) => a - b)
      questions[qi] = { ...q, correct_answers }
      return { ...prev, questions }
    })

  const updateQuestion = async (qi: number, field: 'text' | 'explanation' | 'image_url', value: string) => {
    const isImportantChange = field === 'text' && !isStudentMode

    if (isImportantChange && form.category_id) {
      const currentQuestion = form.questions[qi]
      const updatedQuestion = {
        text: field === 'text' ? value : currentQuestion.text,
        options: currentQuestion.options,
        correct_answer: currentQuestion.correct_answers,
        explanation: currentQuestion.explanation,
        image_url: currentQuestion.image_url,
      }

      const usage = await checkQuestionUsage(updatedQuestion)

      if (usage && usage.exists && usage.usage_count && usage.usage_count > 1) {
        setPendingQuestionUpdate({ index: qi, field, value })
        setShowBankWarning(true)
        return
      }
    }

    setForm((prev) => {
      const questions = [...prev.questions]
      questions[qi] = { ...questions[qi], [field]: value }
      return { ...prev, questions }
    })
  }

  const removeQuestionImage = (qi: number) =>
    setForm((prev) => {
      const questions = [...prev.questions]
      questions[qi] = { ...questions[qi], image_url: '' }
      return { ...prev, questions }
    })

  const applyPendingQuestionUpdate = useCallback(() => {
    if (pendingQuestionUpdate) {
      const { index, field, value } = pendingQuestionUpdate
      setForm((prev) => {
        const questions = [...prev.questions]
        questions[index] = { ...questions[index], [field]: value }
        return { ...prev, questions }
      })
    }
    setPendingQuestionUpdate(null)
    clearUsageInfo()
  }, [pendingQuestionUpdate, clearUsageInfo, setForm])

  const handleApplyImportedQuiz = (
    importedQuiz: ImportedQuiz,
    importInfo?: {
      bankCheck?: any
      previewSummary?: { totalQuestions: number; validQuestions: number; errors: number; warnings: number }
      diagnostics?: Array<{ level?: 'error' | 'warning'; code?: string; message: string; questionIndex?: number }>
    }
  ) => {
    const mappedQuestions = importedQuiz.questions.map((q) => ({
      question_no: q.question_no,
      data: {
        text: q.text,
        options: q.options.length >= 2 ? q.options : [...q.options, ''],
        correct_answers: q.correct_answer,
        explanation: q.explanation ?? '',
        image_url: q.image_url ?? '',
      } as QuestionForm,
    }))

    const importedCategoryToken = (importedQuiz.category_id ?? '').trim()
    const importedCourseCode = (importedQuiz.course_code ?? '').trim()
    const matchedCategory = categories.find(
      (cat) =>
        cat._id === importedCategoryToken ||
        cat.name.trim().toLowerCase() === importedCategoryToken.toLowerCase() ||
        (importedCourseCode && cat.name.trim().toLowerCase() === importedCourseCode.toLowerCase())
    )
    let overwriteCount = 0
    let addedCount = 0
    let nextLength = 0

    setForm((prev) => {
      const isSingleEmptyQuestion =
        prev.questions.length === 1 &&
        !prev.questions[0].text.trim() &&
        !prev.questions[0].options.some((o) => o.trim()) &&
        prev.questions[0].correct_answers.length === 0

      const nextQuestions = isSingleEmptyQuestion ? [] : [...prev.questions]
      const hasQuestionNo = mappedQuestions.some((q) => typeof q.question_no === 'number' && q.question_no > 0)

      if (hasQuestionNo) {
        mappedQuestions.forEach((item) => {
          const targetIndex =
            typeof item.question_no === 'number' && item.question_no > 0
              ? item.question_no - 1
              : nextQuestions.length

          while (nextQuestions.length <= targetIndex) {
            nextQuestions.push(emptyQuestion())
          }

          const existing = nextQuestions[targetIndex]
          const hasExistingContent =
            existing &&
            (existing.text.trim() ||
              existing.options.some((o) => o.trim()) ||
              existing.correct_answers.length > 0 ||
              existing.explanation.trim() ||
              existing.image_url.trim())

          if (hasExistingContent) overwriteCount += 1
          else addedCount += 1

          nextQuestions[targetIndex] = item.data
        })
      } else {
        mappedQuestions.forEach((item) => {
          nextQuestions.push(item.data)
          addedCount += 1
        })
      }

      nextLength = nextQuestions.length

      return {
        ...prev,
        description: importedQuiz.description || prev.description,
        category_id: matchedCategory?._id ?? prev.category_id,
        course_code: importedCourseCode || prev.course_code,
        questions: nextQuestions,
      }
    })

    if (nextLength > 0) {
      setTargetCount(nextLength)
      setTargetInput(String(nextLength))
    }

    const report = analyzeQuestionStructure(
      importedQuiz.questions.map((q) => ({
        options: q.options,
        correct_answer: q.correct_answer,
      }))
    )
    setAppliedStructureReport(report)

    if (importInfo?.previewSummary) {
      setAppliedImportSummary({
        summary: importInfo.previewSummary,
        isValid: (importInfo.previewSummary.errors ?? 0) === 0,
        sameAnswerCount: importInfo.bankCheck?.same_answer_conflicts ?? 0,
        differentAnswerCount: importInfo.bankCheck?.different_answer_conflicts ?? 0,
        diagnostics: importInfo.diagnostics,
      })
    }

    setHasImportBlockingErrors(false)
    setImportPreviewErrors([])
    setShowImportPanel(false)
    onConflictsResolved?.()

    if ((importedCategoryToken || importedCourseCode) && !matchedCategory) {
      toast.error(`No course category matched "${importedCategoryToken || importedCourseCode}". Please select a category manually.`)
    }

    if (overwriteCount > 0) {
      toast.success(`File applied: added ${addedCount} questions, overwritten ${overwriteCount} questions with duplicate numbering.`)
    } else {
      toast.success(`File applied: added ${addedCount} questions.`)
    }
  }

  const reanalyzeFormQuestions = useCallback(() => {
    const mapped = form.questions.map((q) => ({
      text: q.text,
      options: q.options || [],
      correct_answer: q.correct_answers || [],
    }))
    const freshReport = analyzeQuestionStructure(mapped)
    setAppliedStructureReport(freshReport)

    const freshDiagnostics: Array<{ level: 'error' | 'warning'; code: string; message: string; questionIndex?: number }> = []

    const duplicateDiagnostics = checkDuplicateQuestions(mapped)
    freshDiagnostics.push(...duplicateDiagnostics)

    form.questions.forEach((q, idx) => {
      if (!q.text.trim()) {
        freshDiagnostics.push({
          level: 'error',
          code: 'EMPTY_TEXT',
          message: `Question ${idx + 1}: Question content is empty`,
          questionIndex: idx,
        })
      }
      const validOpts = (q.options || []).filter((o) => o.trim())
      if (validOpts.length < 2) {
        freshDiagnostics.push({
          level: 'error',
          code: 'TOO_FEW_OPTIONS',
          message: `Question ${idx + 1}: At least 2 options required`,
          questionIndex: idx,
        })
      }
      if (!q.correct_answers || q.correct_answers.length === 0) {
        freshDiagnostics.push({
          level: 'warning',
          code: 'NO_CORRECT_ANSWER',
          message: `Question ${idx + 1}: No correct answer selected`,
          questionIndex: idx,
        })
      }
    })

    if (!form.course_code) {
      freshDiagnostics.push({
        level: 'warning',
        code: 'MISSING_COURSE_CODE',
        message: 'Missing course code (quizMeta.course_code) - you can enter it manually in the form before saving',
      })
    }
    if (!form.category_id) {
      freshDiagnostics.push({
        level: 'warning',
        code: 'MISSING_CATEGORY_ID',
        message: 'Missing category_id - you can select a category in the form before saving',
      })
    }
    if (!form.description) {
      freshDiagnostics.push({
        level: 'warning',
        code: 'MISSING_DESCRIPTION',
        message: 'Missing quiz description (quizMeta.description) - can be skipped or entered in the form',
      })
    }

    const errorCount = freshDiagnostics.filter((d) => d.level === 'error').length
    const warningCount = freshDiagnostics.filter((d) => d.level === 'warning').length

    setAppliedImportSummary({
      summary: {
        totalQuestions: form.questions.length,
        validQuestions: form.questions.length - errorCount,
        errors: errorCount,
        warnings: warningCount,
      },
      isValid: errorCount === 0,
      sameAnswerCount: appliedImportSummary?.sameAnswerCount ?? 0,
      differentAnswerCount: appliedImportSummary?.differentAnswerCount ?? 0,
      diagnostics: freshDiagnostics,
    })

    if (freshDiagnostics.length === 0) {
      toast.success('Report updated: No duplicates or errors remaining in form!')
    } else {
      toast.success(`Updated: ${errorCount} errors and ${warningCount} warnings remaining.`)
    }
  }, [form.questions, form.course_code, form.category_id, form.description, appliedImportSummary, toast])

  return {
    targetCount,
    targetInput,
    setTargetInput,
    applyTargetCount,
    addQuestion,
    removeQuestion,
    updateOption,
    addOption,
    removeOption,
    toggleCorrect,
    updateQuestion,
    removeQuestionImage,
    applyPendingQuestionUpdate,
    pendingQuestionData,
    showBankWarning,
    setShowBankWarning,
    usageInfo,
    clearUsageInfo,
    hasImportBlockingErrors,
    setHasImportBlockingErrors,
    importPreviewErrors,
    setImportPreviewErrors,
    showImportPanel,
    setShowImportPanel,
    isImportProcessing,
    setIsImportProcessing,
    appliedStructureReport,
    setAppliedStructureReport,
    appliedImportSummary,
    setAppliedImportSummary,
    handleApplyImportedQuiz,
    reanalyzeFormQuestions,
  }
}
