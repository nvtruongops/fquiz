'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateHistoryForQuiz } from '@/lib/core/utils/cache-invalidation'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { extractApiErrorMessage } from '@/lib/core/utils/error-utils'
import type { QuizDiagnostics } from '@/lib/modules/quiz/quiz-analyzer'
import type { QuizFormData, QuestionForm } from '@/lib/modules/quiz/types/quiz'

export interface UseQuizSaveOptions {
  quizId?: string
  initialUpdatedAt?: string | null
  isStudentMode: boolean
  canSaveDraft: boolean
  createEndpoint?: string
  updateEndpointBuilder?: (id: string) => string
  redirectOnPublish?: string
  onBeforeSubmit?: (data: any) => boolean | undefined
  onServerConflict?: (conflicts: any) => void
  form: QuizFormData
  setForm: React.Dispatch<React.SetStateAction<QuizFormData>>
  diagnostics: QuizDiagnostics
  hasImportBlockingErrors: boolean
  isImportProcessing: boolean
  waitForAutosave: () => Promise<void>
  setLastSavedAt: (date: Date) => void
  scrollToQuestion: (idx: number) => void
}

function effectiveOptions(q: QuestionForm): string[] {
  let last = q.options.length - 1
  while (last > 1 && !q.options[last].trim()) last--
  return q.options.slice(0, last + 1)
}

export function useQuizSave(options: UseQuizSaveOptions) {
  const {
    quizId,
    initialUpdatedAt,
    isStudentMode,
    canSaveDraft,
    createEndpoint,
    updateEndpointBuilder,
    redirectOnPublish,
    onBeforeSubmit,
    onServerConflict,
    form,
    setForm,
    diagnostics,
    hasImportBlockingErrors,
    isImportProcessing,
    waitForAutosave,
    setLastSavedAt,
    scrollToQuestion,
  } = options

  const router = useRouter()
  const queryClient = useQueryClient()
  const DRAFT_KEY = 'quiz_editor_draft_id'

  const [activeQuizId, setActiveQuizId] = useState<string | undefined>(quizId)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [, setLastUpdatedAt] = useState<string | null>(initialUpdatedAt ?? null)
  const lastUpdatedAtRef = useRef<string | null>(initialUpdatedAt ?? null)

  const effectiveCreateEndpoint = useMemo(
    () => createEndpoint ?? `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/quizzes`,
    [createEndpoint]
  )

  const effectiveUpdateEndpointBuilder = useMemo(
    () =>
      updateEndpointBuilder ??
      ((id: string) => {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
        return `${baseUrl}/api/student/quizzes/${id}`
      }),
    [updateEndpointBuilder]
  )

  const effectiveRedirectOnPublish = useMemo(
    () => redirectOnPublish ?? (isStudentMode ? '/my-quizzes' : '/teacher/quizzes'),
    [redirectOnPublish, isStudentMode]
  )

  const { toast } = useToast()

  const syncToQuestionBank = useCallback(
    async (qId: string, status: string) => {
      if (isStudentMode || !form.category_id || status !== 'published') return
      try {
        await fetch('/api/question-bank/auto-sync', {
          method: 'POST',
          credentials: 'include',
          headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            category_id: form.category_id,
            course_code: form.course_code.trim().toUpperCase(),
            quiz_id: qId || undefined,
            questions: form.questions.map((q) => ({
              text: q.text,
              options: q.options,
              correct_answer: q.correct_answers,
              explanation: q.explanation,
              image_url: q.image_url,
            })),
          }),
        })
      } catch (e) {
        console.error('Auto-sync failed:', e)
      }
    },
    [isStudentMode, form.category_id, form.course_code, form.questions]
  )

  const handlePostSaveRedirect = useCallback(
    (status: string) => {
      if (status === 'published') {
        sessionStorage.removeItem(DRAFT_KEY)
        toast.success(isStudentMode ? 'Quiz created successfully!' : 'Quiz published successfully!')
        router.push(effectiveRedirectOnPublish)
        router.refresh()
      } else {
        toast.success('Draft saved successfully')
      }
    },
    [effectiveRedirectOnPublish, isStudentMode, router, toast]
  )

  const handleSaveSuccess = useCallback(
    async (data: any, status: string, quiet: boolean) => {
      const savedId = data?.quiz?._id ? String(data.quiz._id) : activeQuizId
      if (savedId) {
        setActiveQuizId(savedId)
        if (!quizId) sessionStorage.setItem(DRAFT_KEY, savedId)
      }
      if (!quiet && data?.quiz?.status) setForm((prev) => ({ ...prev, status: data.quiz.status }))
      setLastUpdatedAt(data?.quiz?.updatedAt ?? null)
      lastUpdatedAtRef.current = data?.quiz?.updatedAt ?? null
      setLastSavedAt(new Date())

      if (!quiet) {
        if (savedId) await invalidateHistoryForQuiz(queryClient, savedId)
        handlePostSaveRedirect(status)
      }
    },
    [activeQuizId, queryClient, quizId, setForm, setLastSavedAt, handlePostSaveRedirect]
  )

  const handleSaveError = useCallback(
    (data: any) => {
      if (data.code === 'CONCURRENCY_ERROR') {
        setError('Data conflict: this quiz was recently modified by someone else. Please reload the page.')
        toast.error('Data conflict! Please refresh the page.')
      } else if (data.error === 'question_bank_conflict' && data.conflicts) {
        onServerConflict?.(data.conflicts)
        setError(
          data.message ||
            'Detected conflicting answers with question bank. Please resolve conflicts before syncing.'
        )
      } else {
        const apiMsg = extractApiErrorMessage(data.error)
        setError(apiMsg)
        if (data.quotaExceeded || data.categoryQuotaExceeded || data.code?.includes('QUOTA')) {
          toast.error(apiMsg)
        }
      }
    },
    [onServerConflict, toast]
  )

  const buildSavePayload = useCallback(
    (overrideStatus?: 'published' | 'draft') => {
      const status = isStudentMode ? 'published' : (overrideStatus ?? form.status)
      return {
        status,
        description: form.description.trim(),
        category_id: form.category_id,
        course_code: form.course_code.trim().toUpperCase() || 'GENERAL',
        lastUpdatedAt: lastUpdatedAtRef.current,
        questions: form.questions.map((q) => {
          const opts = effectiveOptions(q)
          return {
            text: q.text.trim(),
            options: opts.map((o) => o.trim()),
            correct_answer: q.correct_answers.filter((a) => a < opts.length),
            ...(q.explanation.trim() ? { explanation: q.explanation.trim() } : {}),
            ...(q.image_url.trim() ? { image_url: q.image_url.trim() } : {}),
          }
        }),
      }
    },
    [form, isStudentMode]
  )

  const executeSaveFetch = useCallback(
    async (payload: any) => {
      const url = activeQuizId ? effectiveUpdateEndpointBuilder(activeQuizId) : effectiveCreateEndpoint
      const method = activeQuizId ? (isStudentMode ? 'PATCH' : 'PUT') : 'POST'
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      return { res, data }
    },
    [activeQuizId, effectiveCreateEndpoint, effectiveUpdateEndpointBuilder, isStudentMode]
  )

  const handleSaveResponse = useCallback(
    async (res: Response, data: any, status: string, quiet: boolean) => {
      if (!res.ok) {
        if (activeQuizId && !quizId && (res.status === 400 || res.status === 404)) {
          setActiveQuizId(undefined)
          sessionStorage.removeItem(DRAFT_KEY)
        }
        if (!quiet) handleSaveError(data)
        return
      }
      const savedId = data?.quiz?._id ? String(data.quiz._id) : activeQuizId || quizId || ''
      await handleSaveSuccess(data, status, quiet)
      if (savedId) await syncToQuestionBank(savedId, status)
    },
    [activeQuizId, handleSaveError, handleSaveSuccess, quizId, syncToQuestionBank]
  )

  const doSave = useCallback(
    async (overrideStatus?: 'published' | 'draft', quiet: boolean = false) => {
      if (!quiet) await waitForAutosave()
      if (!quiet) setSaving(true)
      setError('')
      const payload = buildSavePayload(overrideStatus)
      try {
        const { res, data } = await executeSaveFetch(payload)
        await handleSaveResponse(res, data, payload.status, quiet)
      } catch {
        if (!quiet) setError('Connection error. Please try again.')
      } finally {
        if (!quiet) setSaving(false)
      }
    },
    [buildSavePayload, executeSaveFetch, handleSaveResponse, waitForAutosave]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (hasImportBlockingErrors) {
      setError('Import file still has errors. Please fix errors in preview before saving.')
      return
    }
    if (!diagnostics.isValid) {
      setError('Please complete all missing required fields before publishing.')
      scrollToQuestion(diagnostics.errors[0]?.questionIndex ?? 0)
      return
    }

    if (onBeforeSubmit) {
      const canProceed = onBeforeSubmit({
        category_id: form.category_id,
        questions: form.questions.map((q) => ({
          text: q.text,
          options: q.options,
          correct_answer: q.correct_answers,
        })),
      })
      if (canProceed === false) return
    }

    await doSave('published')
  }

  const handleSaveDraft = async () => {
    if (!canSaveDraft) return
    if (hasImportBlockingErrors) {
      setError('Import file still has errors. Please fix errors in preview before saving.')
      return
    }
    await doSave('draft')
  }

  const isSubmitBlocked = saving || hasImportBlockingErrors || isImportProcessing

  return {
    activeQuizId,
    setActiveQuizId,
    error,
    setError,
    saving,
    isSubmitBlocked,
    doSave,
    handleSubmit,
    handleSaveDraft,
  }
}
