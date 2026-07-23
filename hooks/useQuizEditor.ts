'use client'

import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateHistoryForQuiz } from '@/lib/core/utils/cache-invalidation'
import { analyzeQuizCompleteness } from '@/lib/modules/quiz/quiz-analyzer'
import { useDebounce } from '@/hooks/shared/useDebounce'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useQuestionBankWarning } from '@/hooks/quiz/useQuestionBankWarning'
import { useQuestionBankCheck } from '@/hooks/quiz/useQuestionBankCheck'
import { extractApiErrorMessage } from '@/lib/core/utils/error-utils'
import { Category, QuizFormData, QuestionForm } from '@/lib/modules/quiz/types/quiz'
import { ImportedQuiz } from '@/components/quiz/question-bank/QuizImportPanel'

const DEFAULT_OPTION_COUNT = 4

export interface QuizEditorOptions {
  initialData?: Partial<QuizFormData>
  quizId?: string
  categories: Category[]
  mode?: 'admin' | 'student'
  createEndpoint?: string
  updateEndpointBuilder?: (id: string) => string
  redirectOnPublish?: string
  cancelPath?: string
  allowDraft?: boolean
  enableAutosave?: boolean
  onBeforeSubmit?: (data: any) => boolean | undefined
  registerApplyResolutions?: (
    fn: (resolutions: Array<{ questionIndex: number; correct_answer: number[]; options: string[] }>) => void
  ) => void
  onServerConflict?: (conflicts: any) => void
}

function emptyQuestion(): QuestionForm {
  return {
    text: '',
    options: new Array(DEFAULT_OPTION_COUNT).fill(''),
    correct_answers: [],
    explanation: '',
    image_url: '',
  }
}

export function useQuizEditor(options: QuizEditorOptions) {
  const {
    initialData,
    quizId,
    categories,
    mode = 'admin',
    createEndpoint,
    updateEndpointBuilder,
    redirectOnPublish,
    allowDraft,
    enableAutosave,
    onBeforeSubmit,
    registerApplyResolutions,
    onServerConflict,
  } = options

  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const DRAFT_KEY = 'quiz_editor_draft_id'

  const [activeQuizId, setActiveQuizId] = useState<string | undefined>(() => {
    return quizId || (typeof window !== 'undefined' ? sessionStorage.getItem(DRAFT_KEY) ?? undefined : undefined)
  })

  const isStudentMode = mode === 'student'
  const canSaveDraft = allowDraft ?? !isStudentMode
  const autosaveEnabled = enableAutosave ?? !isStudentMode

  const effectiveCreateEndpoint = useMemo(() =>
    createEndpoint ??
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${isStudentMode ? '/api/student/quizzes' : '/api/admin/quizzes'}`,
  [createEndpoint, isStudentMode])

  const effectiveUpdateEndpointBuilder = useMemo(() =>
    updateEndpointBuilder ?? ((id: string) => {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
      const subPath = isStudentMode ? `/api/student/quizzes/${id}` : `/api/admin/quizzes/${id}`
      return `${baseUrl}${subPath}`
    }),
  [updateEndpointBuilder, isStudentMode])

  const effectiveRedirectOnPublish = useMemo(() =>
    redirectOnPublish ?? (isStudentMode ? '/my-quizzes' : '/admin/quizzes'),
  [redirectOnPublish, isStudentMode])

  const [form, setForm] = useState<QuizFormData>(() => ({
    description: (initialData as any)?.description ?? '',
    category_id: initialData?.category_id ?? '',
    course_code: (initialData as any)?.course_code ?? '',
    questions: initialData?.questions?.length
      ? (initialData.questions as QuestionForm[])
      : [emptyQuestion()],
    status: initialData?.status ?? 'published',
  }))

  const [targetCount, setTargetCount] = useState(form.questions.length)
  const [targetInput, setTargetInput] = useState(String(form.questions.length))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [autosaving, setAutosaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>((initialData as any)?.updatedAt ?? null)
  const lastUpdatedAtRef = useRef<string | null>((initialData as any)?.updatedAt ?? null)

  const [hasImportBlockingErrors, setHasImportBlockingErrors] = useState(false)
  const [importPreviewErrors, setImportPreviewErrors] = useState<Array<{ code: string; message: string; questionIndex?: number }>>([])
  const [showImportPanel, setShowImportPanel] = useState(false)
  const [isImportProcessing, setIsImportProcessing] = useState(false)
  const importEnabled = process.env.NEXT_PUBLIC_ENABLE_QUIZ_IMPORT !== 'false'

  const { checkQuestionUsage, usageInfo, clearUsageInfo } = useQuestionBankWarning(form.category_id)
  const [showBankWarning, setShowBankWarning] = useState(false)
  const [pendingQuestionUpdate, setPendingQuestionUpdate] = useState<{
    index: number
    field: 'text' | 'explanation' | 'image_url'
    value: string
  } | null>(null)

  const bankCheck = useQuestionBankCheck({
    categoryId: form.category_id,
    questions: form.questions.map(q => ({
      text: q.text,
      options: q.options,
      correct_answer: q.correct_answers,
      explanation: q.explanation,
      image_url: q.image_url,
    })),
    enabled: !isStudentMode && !!form.category_id,
    autoCheck: false,
    debounceMs: 2000,
  })

  const bankCheckResults = useMemo(() => {
    const map: Record<number, boolean> = {}
    if (bankCheck.result?.conflicts) {
      bankCheck.result.conflicts.same_answer.forEach(c => { map[c.questionIndex] = true })
      bankCheck.result.conflicts.different_answer.forEach(c => { map[c.questionIndex] = true })
    }
    return map
  }, [bankCheck.result])

  const diagnostics = useMemo(() => analyzeQuizCompleteness({ ...form, course_code: form.course_code } as any, targetCount), [form, targetCount])
  const isSubmitBlocked = saving || hasImportBlockingErrors || isImportProcessing

  const debouncedForm = useDebounce(form, 3000)
  const isFirstLoad = useRef(true)
  const autosaveInFlightRef = useRef(false)
  const autosaveResolveRef = useRef<(() => void) | null>(null)
  const formSnapshotRef = useRef(form)
  const forceSaveAfterResolveRef = useRef(false)
  const lastSavedSignatureRef = useRef<string | null>(null)

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
  }, [pendingQuestionUpdate, clearUsageInfo])

  function effectiveOptions(q: QuestionForm): string[] {
    let last = q.options.length - 1
    while (last > 1 && !q.options[last].trim()) last--
    return q.options.slice(0, last + 1)
  }

  const syncToQuestionBank = useCallback(async (qId: string, status: string) => {
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
          questions: form.questions.map(q => ({ text: q.text, options: q.options, correct_answer: q.correct_answers, explanation: q.explanation, image_url: q.image_url })),
        }),
      })
    } catch (e) {
      console.error('Auto-sync failed:', e)
    }
  }, [isStudentMode, form.category_id, form.course_code, form.questions])

  const handleSaveSuccess = useCallback(async (data: any, status: string, quiet: boolean) => {
    const savedId = data?.quiz?._id ? String(data.quiz._id) : activeQuizId
    if (savedId) setActiveQuizId(savedId)
    if (!quiet && data?.quiz?.status) setForm(prev => ({ ...prev, status: data.quiz.status }))
    setLastUpdatedAt(data?.quiz?.updatedAt ?? null)
    lastUpdatedAtRef.current = data?.quiz?.updatedAt ?? null
    setLastSavedAt(new Date())

    if (savedId && !quizId) {
      sessionStorage.setItem(DRAFT_KEY, savedId)
    }

    if (!quiet) {
      if (savedId) await invalidateHistoryForQuiz(queryClient, savedId)
      if (status === 'published') {
        sessionStorage.removeItem(DRAFT_KEY)
        toast.success(isStudentMode ? 'Đã tạo quiz thành công!' : 'Đã công khai quiz thành công!')
        router.push(effectiveRedirectOnPublish)
        router.refresh()
      } else {
        toast.success('Đã lưu bản nháp')
      }
    }
  }, [activeQuizId, isStudentMode, effectiveRedirectOnPublish, queryClient, router, toast, quizId])

  const doSave = useCallback(async (overrideStatus?: 'published' | 'draft', quiet: boolean = false) => {
    if (!quiet && autosaveInFlightRef.current) {
      await new Promise<void>(res => { autosaveResolveRef.current = res })
    }
    if (!quiet) setSaving(true)
    setError('')
    const status = isStudentMode ? 'published' : (overrideStatus ?? form.status)
    const currentLastUpdatedAt = lastUpdatedAtRef.current
    const payload = {
      description: form.description.trim(), category_id: form.category_id, course_code: form.course_code.trim().toUpperCase() || 'GENERAL', status, lastUpdatedAt: currentLastUpdatedAt,
      questions: form.questions.map(q => {
        const opts = effectiveOptions(q)
        return { text: q.text.trim(), options: opts.map(o => o.trim()), correct_answer: q.correct_answers.filter(a => a < opts.length), ...(q.explanation.trim() ? { explanation: q.explanation.trim() } : {}), ...(q.image_url.trim() ? { image_url: q.image_url.trim() } : {}) }
      }),
    }
    try {
      const url = activeQuizId ? effectiveUpdateEndpointBuilder(activeQuizId) : effectiveCreateEndpoint
      const res = await fetch(url, { method: activeQuizId ? (isStudentMode ? 'PATCH' : 'PUT') : 'POST', credentials: 'include', headers: withCsrfHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) {
        if (!quiet) {
          if (data.code === 'CONCURRENCY_ERROR') {
            setError('Xung đột dữ liệu. Có người vừa chỉnh sửa quiz này. Hãy tải lại trang.')
            toast.error('Xung đột dữ liệu! Vui lòng làm mới trang.')
          } else if (data.error === 'question_bank_conflict' && data.conflicts) {
            onServerConflict?.(data.conflicts)
            setError(
              data.message ||
                'Phát hiện câu hỏi mâu thuẫn đáp án với ngân hàng. Vui lòng chọn đáp án đúng để đồng bộ.'
            )
          } else {
            const apiMsg = extractApiErrorMessage(data.error)
            setError(apiMsg)
            if (data.quotaExceeded || data.categoryQuotaExceeded || data.code?.includes('QUOTA')) {
              toast.error(apiMsg)
            }
          }
        }
        return
      }
      const savedId = data?.quiz?._id ? String(data.quiz._id) : activeQuizId || quizId || ''
      await handleSaveSuccess(data, status, quiet)
      if (savedId) {
        await syncToQuestionBank(savedId, status)
      }
    } catch {
      if (!quiet) setError('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      if (!quiet) setSaving(false)
    }
  }, [isStudentMode, form, activeQuizId, effectiveUpdateEndpointBuilder, effectiveCreateEndpoint, handleSaveSuccess, syncToQuestionBank, toast, onServerConflict, quizId])

  const scrollToQuestion = (idx: number) => {
    const el = document.getElementById(`q-card-${idx}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-red-500', 'ring-offset-2')
      setTimeout(() => el.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2'), 2000)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (hasImportBlockingErrors) {
      setError('File import vẫn còn lỗi. Vui lòng sửa lỗi trong preview trước khi lưu.')
      return
    }
    if (!diagnostics.isValid) {
      setError('Vui lòng hoàn thiện các thông tin còn thiếu trước khi công khai.')
      scrollToQuestion(diagnostics.errors[0]?.questionIndex ?? 0)
      return
    }

    if (onBeforeSubmit) {
      const canProceed = onBeforeSubmit({
        category_id: form.category_id,
        questions: form.questions.map(q => ({
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
      setError('File import vẫn còn lỗi. Vui lòng sửa lỗi trong preview trước khi lưu.')
      return
    }
    await doSave('draft')
  }

  const handleAutosave = useCallback(async () => {
    if (autosaveInFlightRef.current) return
    autosaveInFlightRef.current = true
    formSnapshotRef.current = form
    const savedSignature = JSON.stringify({
      description: form.description,
      category_id: form.category_id,
      course_code: form.course_code,
      status: form.status,
      questions: form.questions,
    })
    setAutosaving(true)
    try {
      await doSave('draft', true)
      lastSavedSignatureRef.current = savedSignature
    } finally {
      setAutosaving(false)
      autosaveInFlightRef.current = false
      autosaveResolveRef.current?.()
      autosaveResolveRef.current = null
    }
  }, [form, doSave])

  useEffect(() => {
    if (!autosaveEnabled) return
    if (!activeQuizId) return
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      lastSavedSignatureRef.current = JSON.stringify({
        description: debouncedForm.description,
        category_id: debouncedForm.category_id,
        course_code: debouncedForm.course_code,
        status: debouncedForm.status,
        questions: debouncedForm.questions,
      })
      return
    }
    if (isImportProcessing) return

    if (debouncedForm.category_id && debouncedForm.course_code) {
      const signature = JSON.stringify({
        description: debouncedForm.description,
        category_id: debouncedForm.category_id,
        course_code: debouncedForm.course_code,
        status: debouncedForm.status,
        questions: debouncedForm.questions,
      })
      if (signature === lastSavedSignatureRef.current) return
      lastSavedSignatureRef.current = signature
      handleAutosave()
    }
  }, [debouncedForm, isImportProcessing, autosaveEnabled, handleAutosave, activeQuizId])

  useEffect(() => {
    if (!registerApplyResolutions) return
    registerApplyResolutions((resolutions) => {
      if (resolutions.length > 0) {
        setForm((prev) => {
          const questions = [...prev.questions]
          for (const r of resolutions) {
            const q = questions[r.questionIndex]
            if (!q) continue
            questions[r.questionIndex] = {
              ...q,
              options: r.options.length > 0 ? r.options : q.options,
              correct_answers: r.correct_answer,
            }
          }
          return { ...prev, questions }
        })
        forceSaveAfterResolveRef.current = true
      } else {
        doSave('published')
      }
    })
  }, [registerApplyResolutions, doSave])

  useEffect(() => {
    if (!forceSaveAfterResolveRef.current) return
    forceSaveAfterResolveRef.current = false
    doSave('published')
  }, [form, doSave])

  const handleApplyImportedQuiz = (importedQuiz: ImportedQuiz) => {
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
    const matchedCategory = categories.find(
      (cat) =>
        cat._id === importedCategoryToken ||
        cat.name.trim().toLowerCase() === importedCategoryToken.toLowerCase()
    )

    const importedCourseCode = (importedQuiz.course_code ?? '').trim()
    let overwriteCount = 0
    let addedCount = 0
    let nextLength = 0

    setForm((prev) => {
      const nextQuestions = [...prev.questions]
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

    setHasImportBlockingErrors(false)
    setImportPreviewErrors([])
    if (overwriteCount > 0) {
      toast.success(`Đã áp dụng file: thêm ${addedCount} câu, ghi đè ${overwriteCount} câu trùng số.`)
    } else {
      toast.success(`Đã áp dụng file: thêm ${addedCount} câu.`)
    }
  }

  return {
    form, setForm,
    targetInput, setTargetInput,
    applyTargetCount,
    addQuestion,
    removeQuestion,
    updateOption,
    addOption,
    removeOption,
    toggleCorrect,
    updateQuestion,
    removeQuestionImage,
    diagnostics,
    bankCheckResults,
    saving,
    autosaving,
    lastSavedAt,
    error,
    isSubmitBlocked,
    canSaveDraft,
    isStudentMode,
    importEnabled,
    showImportPanel, setShowImportPanel,
    handleApplyImportedQuiz,
    setHasImportBlockingErrors,
    setImportPreviewErrors,
    setIsImportProcessing,
    scrollToQuestion,
    handleSubmit,
    handleSaveDraft,
    showBankWarning, setShowBankWarning,
    usageInfo, clearUsageInfo,
    pendingQuestionData,
    applyPendingQuestionUpdate,
  }
}
