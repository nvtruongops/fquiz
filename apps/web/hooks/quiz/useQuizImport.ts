'use client'

import * as React from 'react'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import type { QuestionStructureReport } from '@/lib/modules/quiz/quiz-import/types'

export interface ImportedQuestion {
  text: string
  options: string[]
  correct_answer: number[]
  question_no?: number
  explanation?: string
  image_url?: string
}

export interface ImportedQuiz {
  title: string
  description: string
  category_id?: string
  course_code: string
  questions: ImportedQuestion[]
}

export interface ImportDiagnostic {
  level: 'error' | 'warning'
  code: string
  message: string
  questionIndex?: number
}

export interface ImportPreviewResponse {
  normalizedQuiz: ImportedQuiz
  diagnostics: ImportDiagnostic[]
  summary: {
    totalQuestions: number
    validQuestions: number
    invalidQuestions: number
    errors: number
    warnings: number
  }
  isValid: boolean
  structureReport?: QuestionStructureReport
}

export interface BankCheckResult {
  total_questions: number
  conflicts_found: number
  same_answer_conflicts: number
  different_answer_conflicts: number
  conflicts: {
    same_answer: Array<{
      questionIndex: number
      conflictType: 'same_answer'
      message: string
    }>
    different_answer: Array<{
      questionIndex: number
      conflictType: 'different_answer'
      message: string
      question?: {
        text: string
        options: string[]
        correct_answer: number[]
      }
      existingQuestion?: {
        question_id?: string
        _id?: string
        correct_answer: number[]
        options?: string[]
        used_in_quizzes: string[]
        usage_count: number
      }
      answerVariants?: Array<{
        correct_answer: number[]
        answer_texts: string[]
        count: number
        quizzes: string[]
        options: string[]
      }>
    }>
  }
  summary: string
}

export interface UseQuizImportOptions {
  onApply: (
    quiz: ImportedQuiz,
    importInfo?: {
      bankCheck?: BankCheckResult | null
      previewSummary?: {
        totalQuestions: number
        validQuestions: number
        errors: number
        warnings: number
      }
      diagnostics?: ImportDiagnostic[]
    }
  ) => void
  onValidationStateChange?: (hasBlockingErrors: boolean) => void
  onPreviewDiagnosticsChange?: (errors: ImportDiagnostic[]) => void
  onProcessingStateChange?: (isProcessing: boolean) => void
  categoryId?: string
  courseCode?: string
  description?: string
}

function getSampleUrl(type: 'json' | 'txt'): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
  const filename = type === 'json' ? 'quiz-valid.json' : 'quiz-valid.txt'
  return `${base}/samples/${filename}`
}

function mapQuestionForBankCheck(q: ImportedQuestion) {
  const opts = q.options.map((o) => o.trim())
  let last = opts.length - 1
  while (last > 1 && !opts[last]) last--
  return {
    text: q.text.trim(),
    options: opts.slice(0, last + 1),
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    image_url: q.image_url,
  }
}

async function syncSingleConflictQuestion(fileQ: ImportedQuestion, categoryId: string, oldQuestionId: string = '') {
  const res = await fetch('/api/question-bank/sync-update', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({
      category_id: categoryId,
      old_question_id: oldQuestionId,
      new_question: {
        text: fileQ.text,
        options: fileQ.options,
        correct_answer: fileQ.correct_answer,
      },
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(
      typeof data?.error === 'string'
        ? data.error
        : 'Failed to sync answer with the question bank.'
    )
  }
}

function applyBankChoiceToQuestion(c: any, choice: any, fileQ: any) {
  const fallbackVariants = c.answerVariants ?? []
  const fallbackVariant = fallbackVariants[choice.variantIdx] ?? fallbackVariants[0]
  const variant = c.existingQuestion
    ? {
        correct_answer: c.existingQuestion.correct_answer,
        options: c.existingQuestion.options ?? fileQ?.options ?? [],
      }
    : fallbackVariant
  if (variant && fileQ) {
    const answerTexts = variant.correct_answer
      .map((i: number) => (variant.options[i] ?? '').trim().toLowerCase())
    const remapped = fileQ.options
      .map((opt: string, idx: number) => ({ idx, t: opt.trim().toLowerCase() }))
      .filter((o: any) => answerTexts.includes(o.t))
      .map((o: any) => o.idx)
    fileQ.correct_answer = remapped.length > 0 ? remapped : variant.correct_answer
  }
}

export function useQuizImport({
  onApply,
  onValidationStateChange,
  onPreviewDiagnosticsChange,
  onProcessingStateChange,
  categoryId,
  courseCode,
  description,
}: UseQuizImportOptions) {
  const [file, setFile] = React.useState<File | null>(null)
  const [fileSnapshot, setFileSnapshot] = React.useState<File | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [preparingFile, setPreparingFile] = React.useState(false)
  const [downloading, setDownloading] = React.useState<'json' | 'txt' | null>(null)
  const [error, setError] = React.useState('')
  const [preview, setPreview] = React.useState<ImportPreviewResponse | null>(null)
  const [bankCheck, setBankCheck] = React.useState<BankCheckResult | null>(null)
  const [checkingBank, setCheckingBank] = React.useState(false)
  const [conflictChoice, setConflictChoice] = React.useState<
    Record<number, { source: 'current' | 'bank'; variantIdx: number }>
  >({})
  const [applying, setApplying] = React.useState(false)
  const [confirmingConflicts, setConfirmingConflicts] = React.useState(false)
  const [conflictsConfirmed, setConflictsConfirmed] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const createFileSnapshot = React.useCallback(async (source: File) => {
    const buffer = await source.arrayBuffer()
    return new File([buffer], source.name, {
      type: source.type || 'application/octet-stream',
      lastModified: source.lastModified,
    })
  }, [])

  const processSelectedFile = React.useCallback((selectedFile: File | null) => {
    setFile(selectedFile)
    setFileSnapshot(null)
    setPreparingFile(false)
    setPreview(null)
    setBankCheck(null)
    setConflictChoice({})
    setConfirmingConflicts(false)
    setConflictsConfirmed(false)
    setError('')
    onValidationStateChange?.(false)
    onPreviewDiagnosticsChange?.([])
    onProcessingStateChange?.(false)

    if (!selectedFile) return

    setPreparingFile(true)
    onProcessingStateChange?.(true)
    void createFileSnapshot(selectedFile)
      .then((snapshot) => {
        setFileSnapshot(snapshot)
        onProcessingStateChange?.(false)
      })
      .catch(() => {
        setFile(null)
        setFileSnapshot(null)
        setError('Unable to read the selected file. Please try again.')
        onValidationStateChange?.(true)
        onProcessingStateChange?.(false)
        onPreviewDiagnosticsChange?.([
          {
            level: 'error',
            code: 'IMPORT_FILE_READ_ERROR',
            message: 'Unable to read the selected file. Please try again.',
          },
        ])
      })
      .finally(() => {
        setPreparingFile(false)
      })
  }, [createFileSnapshot, onValidationStateChange, onPreviewDiagnosticsChange, onProcessingStateChange])

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files?.[0] ?? null
    if (droppedFile) {
      const ext = droppedFile.name.split('.').pop()?.toLowerCase()
      if (ext === 'json' || ext === 'txt') {
        processSelectedFile(droppedFile)
      } else {
        setError('Only .json or .txt file formats are supported')
      }
    }
  }, [processSelectedFile])

  const handleDownloadSample = async (type: 'json' | 'txt') => {
    const url = getSampleUrl(type)
    const filename = type === 'json' ? 'quiz-valid.json' : 'quiz-valid.txt'

    setDownloading(type)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('DOWNLOAD_FAILED')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      if (!objectUrl.startsWith('blob:')) {
        throw new Error('Security check failed')
      }
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setError('Unable to download sample file. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  const performBankCheck = React.useCallback(async (targetPreview: ImportPreviewResponse, catId?: string) => {
    if (!targetPreview.isValid || targetPreview.normalizedQuiz.questions.length === 0) {
      return
    }

    if (!catId) {
      setBankCheck({
        total_questions: targetPreview.normalizedQuiz.questions.length,
        conflicts_found: 0,
        same_answer_conflicts: 0,
        different_answer_conflicts: 0,
        conflicts: { same_answer: [], different_answer: [] },
        summary: ' No subject selected - unable to check Question Bank',
      })
      return
    }

    setCheckingBank(true)
    try {
      const checkRes = await fetch('/api/question-bank/check', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          category_id: catId,
          questions: targetPreview.normalizedQuiz.questions.map(mapQuestionForBankCheck),
        }),
      })

      if (checkRes.ok) {
        const checkData: BankCheckResult = await checkRes.json()
        setBankCheck(checkData)
      }
    } catch (err) {
      console.error('Question bank check failed:', err)
    } finally {
      setCheckingBank(false)
    }
  }, [])

  React.useEffect(() => {
    if (preview) {
      void performBankCheck(preview, categoryId)
    }
  }, [categoryId, preview, performBankCheck])

  const handlePreviewCatchError = (err: unknown) => {
    const message = err instanceof Error ? err.message : ''
    const uploadChanged = /upload file changed|ERR_UPLOAD_FILE_CHANGED/i.test(message)
    const errText = uploadChanged
      ? 'File was modified after selection. Please select the file again.'
      : 'Network error during import preview'

    setError(errText)
    setPreview(null)
    onValidationStateChange?.(true)
    onPreviewDiagnosticsChange?.([
      {
        level: 'error',
        code: uploadChanged ? 'IMPORT_FILE_CHANGED' : 'IMPORT_NETWORK_ERROR',
        message: errText,
      },
    ])
  }

  const handlePreview = async () => {
    if (!file || !fileSnapshot) {
      setError('Please select a .json or .txt file')
      return
    }

    setLoading(true)
    setError('')
    setBankCheck(null)
    setConflictChoice({})
    setConfirmingConflicts(false)
    setConflictsConfirmed(false)
    onProcessingStateChange?.(true)
    try {
      const form = new FormData()
      form.append('file', fileSnapshot)
      const queryParams = new URLSearchParams()
      if (categoryId) queryParams.set('category_id', categoryId)
      if (courseCode) queryParams.set('course_code', courseCode)
      if (description) queryParams.set('description', description)

      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/import/quiz/preview?${queryParams.toString()}`
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders(),
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Unable to preview imported file')
        setPreview(null)
        onValidationStateChange?.(true)
        onPreviewDiagnosticsChange?.([
          {
            level: 'error',
            code: 'IMPORT_PREVIEW_FAILED',
            message: typeof data?.error === 'string' ? data.error : 'Unable to preview imported file',
          },
        ])
        return
      }

      const nextPreview = data as ImportPreviewResponse
      const filteredDiagnostics = nextPreview.diagnostics.filter((d) =>
        !(d.code === 'MISSING_CATEGORY_ID' && (categoryId || nextPreview.normalizedQuiz.category_id)) &&
        !(d.code === 'MISSING_COURSE_CODE' && (courseCode || nextPreview.normalizedQuiz.course_code)) &&
        !(d.code === 'MISSING_DESCRIPTION' && (description || nextPreview.normalizedQuiz.description))
      )

      const cleanedPreview: ImportPreviewResponse = {
        ...nextPreview,
        diagnostics: filteredDiagnostics,
        summary: {
          ...nextPreview.summary,
          warnings: filteredDiagnostics.filter((item) => item.level === 'warning').length,
          errors: filteredDiagnostics.filter((item) => item.level === 'error').length,
        },
      }

      setPreview(cleanedPreview)
      void performBankCheck(cleanedPreview, categoryId)
      onValidationStateChange?.(!cleanedPreview.isValid)
      onPreviewDiagnosticsChange?.(cleanedPreview.diagnostics.filter((item) => item.level === 'error'))
    } catch (err) {
      handlePreviewCatchError(err)
    } finally {
      setLoading(false)
      onProcessingStateChange?.(false)
    }
  }

  const handleApply = async () => {
    if (!preview) return
    const quiz = preview.normalizedQuiz
    const diffConflicts = bankCheck?.conflicts.different_answer ?? []

    if (diffConflicts.length === 0) {
      onApply(quiz, { bankCheck, previewSummary: preview.summary, diagnostics: preview.diagnostics })
      return
    }

    if (!conflictsConfirmed) {
      setError('Please click "Confirm Answer Selection" before applying quiz to the form.')
      return
    }

    setApplying(true)
    try {
      const questions = quiz.questions.map((q) => ({ ...q, options: [...q.options], correct_answer: [...q.correct_answer] }))

      for (const c of diffConflicts) {
        const choice = conflictChoice[c.questionIndex] ?? { source: 'current', variantIdx: 0 }
        if (choice.source === 'bank') {
          applyBankChoiceToQuestion(c, choice, questions[c.questionIndex])
        }
      }

      onApply({ ...quiz, questions }, { bankCheck, previewSummary: preview.summary, diagnostics: preview.diagnostics })
    } catch (err) {
      console.error('Apply with conflict resolution failed:', err)
      setError('Unable to apply selected answers. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  const handleConfirmConflictChoices = async () => {
    if (!preview || !bankCheck || bankCheck.different_answer_conflicts === 0) return

    setConfirmingConflicts(true)
    setError('')
    try {
      for (const c of bankCheck.conflicts.different_answer) {
        const choice = conflictChoice[c.questionIndex] ?? { source: 'current', variantIdx: 0 }
        if (choice.source !== 'current') continue

        const fileQ = preview.normalizedQuiz.questions[c.questionIndex]
        if (!fileQ) continue
        if (!categoryId) throw new Error('Please select a subject before syncing answers.')

        const oldQId = c.existingQuestion?.question_id || c.existingQuestion?._id || ''
        await syncSingleConflictQuestion(fileQ, categoryId, oldQId)
      }

      setConflictsConfirmed(true)
    } catch (err) {
      setConflictsConfirmed(false)
      setError(err instanceof Error ? err.message : 'Unable to sync answers. Please try again.')
    } finally {
      setConfirmingConflicts(false)
    }
  }

  const handleConflictChoiceChange = (
    questionIndex: number,
    choice: { source: 'current' | 'bank'; variantIdx: number }
  ) => {
    setConflictChoice((prev) => ({
      ...prev,
      [questionIndex]: choice,
    }))
    setConflictsConfirmed(false)
  }

  return {
    file,
    fileSnapshot,
    loading,
    preparingFile,
    downloading,
    error,
    setError,
    preview,
    bankCheck,
    checkingBank,
    conflictChoice,
    applying,
    confirmingConflicts,
    conflictsConfirmed,
    isDragging,
    fileInputRef,
    processSelectedFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDownloadSample,
    handlePreview,
    handleApply,
    handleConfirmConflictChoices,
    handleConflictChoiceChange,
  }
}
