'use client'

import * as React from 'react'
import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateHistoryForQuiz } from '@/lib/cache-invalidation'
import { analyzeQuizCompleteness } from '@/lib/quiz-analyzer'
import { useDebounce } from '@/hooks/useDebounce'
import { useToast } from '@/lib/store/toast-store'
import { withCsrfHeaders } from '@/lib/csrf'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { ImageUpload } from './ImageUpload'
import { QuizImportPanel, ImportedQuiz } from './QuizImportPanel'
import { cn } from '@/lib/utils'
import { useQuestionBankWarning } from '@/hooks/useQuestionBankWarning'
import { QuestionBankWarning } from './QuestionBankWarning'
import { useQuestionBankCheck } from '@/hooks/useQuestionBankCheck'
import { extractApiErrorMessage } from '@/lib/error-utils'
import { Category, QuizFormData, QuestionForm } from '@/types/quiz'

// Sub-components
import { EditorMetadataForm } from './editor/EditorMetadataForm'
import { QuestionEditorCard } from './editor/QuestionEditorCard'
import { EditorProgressHub } from './editor/EditorProgressHub'
import { EditorControlPanel } from './editor/EditorControlPanel'

const DEFAULT_OPTION_COUNT = 4

interface Props {
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
}

function emptyQuestion(): QuestionForm {
  return {
    text: '',
    options: Array(DEFAULT_OPTION_COUNT).fill(''),
    correct_answers: [],
    explanation: '',
    image_url: '',
  }
}

export function QuizEditor({
  initialData,
  quizId,
  categories,
  mode = 'admin',
  createEndpoint,
  updateEndpointBuilder,
  redirectOnPublish,
  cancelPath,
  allowDraft,
  enableAutosave,
}: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [activeQuizId, setActiveQuizId] = useState<string | undefined>(quizId)

  const isStudentMode = mode === 'student'
  const canSaveDraft = allowDraft ?? !isStudentMode
  const autosaveEnabled = enableAutosave ?? !isStudentMode
  const effectiveCreateEndpoint = useMemo(() => 
    createEndpoint ??
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${isStudentMode ? '/api/student/quizzes' : '/api/admin/quizzes'}`,
  [createEndpoint, isStudentMode])

  const effectiveUpdateEndpointBuilder = useMemo(() => 
    updateEndpointBuilder ?? ((id: string) =>
      `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${isStudentMode ? `/api/student/quizzes/${id}` : `/api/admin/quizzes/${id}`}`
    ),
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
    const n = Math.max(1, Math.min(maxCount, parseInt(raw) || 1))
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

  const handleUpdateThisQuizOnly = () => {
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
  }

  const handleUpdateAllQuizzes = () => {
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
    toast.success('Đã cập nhật tất cả quiz thành công!')
  }

  function effectiveOptions(q: QuestionForm): string[] {
    let last = q.options.length - 1
    while (last > 1 && !q.options[last].trim()) last--
    return q.options.slice(0, last + 1)
  }

  const syncToQuestionBank = useCallback(async (quizId: string, status: string) => {
    if (isStudentMode || !form.category_id || status !== 'published') return
    try {
      await fetch('/api/question-bank/auto-sync', {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          category_id: form.category_id,
          course_code: form.course_code,
          questions: form.questions.map(q => ({ text: q.text, options: q.options, correct_answer: q.correct_answers, explanation: q.explanation, image_url: q.image_url })),
        }),
      })
    } catch (e) { console.log('Auto-sync failed:', e) }
  }, [isStudentMode, form.category_id, form.course_code, form.questions])

  const handleSaveSuccess = useCallback(async (data: any, status: string, quiet: boolean) => {
    const savedId = data?.quiz?._id ? String(data.quiz._id) : activeQuizId
    if (savedId) setActiveQuizId(savedId)
    if (!quiet && data?.quiz?.status) setForm(prev => ({ ...prev, status: data.quiz.status }))
    setLastUpdatedAt(data.quiz.updatedAt)
    setLastSavedAt(new Date())

    if (!quiet) {
      if (savedId) await invalidateHistoryForQuiz(queryClient, savedId)
      if (status === 'published') {
        toast.success(isStudentMode ? 'Đã tạo quiz thành công!' : 'Đã công khai quiz thành công!')
        router.push(effectiveRedirectOnPublish)
        router.refresh()
      } else {
        toast.success('Đã lưu bản nháp')
      }
    }
  }, [activeQuizId, isStudentMode, effectiveRedirectOnPublish, queryClient, router, toast])

  const doSave = useCallback(async (overrideStatus?: 'published' | 'draft', quiet: boolean = false) => {
    if (!quiet && autosaveInFlightRef.current) {
      await new Promise<void>(res => { const i = setInterval(() => { if (!autosaveInFlightRef.current) { clearInterval(i); res() } }, 100) })
    }
    if (!quiet) setSaving(true)
    setError('')
    const status = isStudentMode ? 'published' : (overrideStatus ?? form.status)
    const payload = {
      description: form.description.trim(), category_id: form.category_id, course_code: form.course_code.trim().toUpperCase() || 'GENERAL', status, lastUpdatedAt,
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
          } else {
            setError(extractApiErrorMessage(data.error))
          }
        }
        return
      }
      await handleSaveSuccess(data, status, quiet)
      await syncToQuestionBank(activeQuizId || '', status)
    } catch { if (!quiet) setError('Lỗi kết nối. Vui lòng thử lại.') }
    finally { if (!quiet) setSaving(false) }
  }, [isStudentMode, form, lastUpdatedAt, activeQuizId, effectiveUpdateEndpointBuilder, effectiveCreateEndpoint, handleSaveSuccess, syncToQuestionBank, toast])

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

    // Trigger bank check manually before publishing
    if (form.status === 'published' && !isStudentMode) {
      await bankCheck.refetch()
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
    setAutosaving(true)
    try {
      await doSave(activeQuizId ? form.status : 'draft', true)
    } finally {
      setAutosaving(false)
      autosaveInFlightRef.current = false
    }
  }, [activeQuizId, form.status, doSave])

  useEffect(() => {
    if (!autosaveEnabled) return
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }
    if (isImportProcessing) return

    if (debouncedForm.category_id && debouncedForm.course_code) {
       handleAutosave()
    }
  }, [debouncedForm, isImportProcessing, autosaveEnabled, handleAutosave])

  const scrollToQuestion = (idx: number) => {
    const el = document.getElementById(`q-card-${idx}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-red-500', 'ring-offset-2')
      setTimeout(() => el.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2'), 2000)
    }
  }

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
    
    // Trigger bank check after import
    if (!isStudentMode) {
      bankCheck.refetch()
    }
  }

  return (
    <div className="p-4 sm:p-8 bg-[#F9F9F7] min-h-screen">
      <div className="w-full mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 w-full space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-[#5D7B6F]">
                {quizId ? 'Chỉnh sửa Quiz' : 'Tạo Quiz mới'}
              </h1>
            </div>

            <EditorMetadataForm 
              form={form} 
              setForm={setForm} 
              categories={categories} 
              isStudentMode={isStudentMode} 
            />

            {!isStudentMode && !form.category_id && (
              <Card className="bg-gray-50 border-gray-300">
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">
                    Vui lòng chọn môn học ở trên để tiếp tục tạo quiz
                  </p>
                </CardContent>
              </Card>
            )}

            {(isStudentMode || form.category_id) && (
              <>
                {importEnabled && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[#A4C3A2] text-[#5D7B6F]"
                      onClick={() => {
                        setShowImportPanel((prev) => !prev)
                        setTimeout(() => {
                          const panel = document.getElementById('quiz-import-panel')
                          panel?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 0)
                      }}
                    >
                      {showImportPanel ? 'Ẩn upload file JSON/TXT' : 'Upload file JSON/TXT'}
                    </Button>
                  </div>
                )}

                {importEnabled && showImportPanel && (
                  <QuizImportPanel
                    onApply={handleApplyImportedQuiz}
                    onValidationStateChange={setHasImportBlockingErrors}
                    onPreviewDiagnosticsChange={(errors) =>
                      setImportPreviewErrors(errors.map((item) => ({ code: item.code, message: item.message, questionIndex: item.questionIndex })))
                    }
                    onProcessingStateChange={setIsImportProcessing}
                    categoryId={form.category_id}
                    mode={mode}
                  />
                )}

                <div className="space-y-4">
                  {form.questions.map((q, i) => (
                    <QuestionEditorCard
                      key={i}
                      question={q}
                      index={i}
                      updateQuestion={updateQuestion}
                      removeQuestion={removeQuestion}
                      updateOption={updateOption}
                      addOption={addOption}
                      removeOption={removeOption}
                      toggleCorrect={toggleCorrect}
                      removeQuestionImage={removeQuestionImage}
                      error={diagnostics.errors.find(e => e.questionIndex === i)}
                      isQuestionBankMatch={bankCheckResults[i]}
                    />
                  ))}
                </div>

                <div className="flex justify-center pt-8">
                  <Button
                    type="button"
                    onClick={addQuestion}
                    className="h-16 px-12 rounded-2xl bg-white border-2 border-[#5D7B6F] text-[#5D7B6F] font-black uppercase tracking-widest hover:bg-[#5D7B6F] hover:text-white transition-all shadow-lg hover:shadow-xl"
                  >
                    + Thêm câu hỏi tiếp theo
                  </Button>
                </div>
              </>
            )}
          </div>

          <aside className="w-full lg:w-80 space-y-6 lg:sticky lg:top-8">
            <EditorProgressHub 
              diagnostics={{
                total: diagnostics.summary.totalQuestions,
                complete: diagnostics.summary.completedQuestions,
                percent: diagnostics.progressPercent,
                isValid: diagnostics.isValid,
                errors: [...diagnostics.errors, ...diagnostics.warnings]
              }} 
              autosaving={autosaving} 
              lastSavedAt={lastSavedAt} 
              onScrollToQuestion={scrollToQuestion} 
            />

            <EditorControlPanel
              targetInput={targetInput}
              setTargetInput={setTargetInput}
              applyTargetCount={applyTargetCount}
              addQuestion={addQuestion}
              onSaveDraft={handleSaveDraft}
              onSubmit={handleSubmit}
              saving={saving}
              isSubmitBlocked={isSubmitBlocked}
              canSaveDraft={canSaveDraft}
              isStudentMode={isStudentMode}
              hasCategory={!!form.category_id}
            />
          </aside>
        </div>
      </div>

      <QuestionBankWarning
        open={showBankWarning}
        onOpenChange={(open) => {
          if (!open) {
            setShowBankWarning(false)
            setPendingQuestionUpdate(null)
            clearUsageInfo()
          }
        }}
        categoryId={form.category_id}
        oldQuestionId={usageInfo?.question_id || ''}
        newQuestion={pendingQuestionData || { text: '', options: [], correct_answer: [] }}
        usageInfo={usageInfo}
        onUpdateThisOnly={handleUpdateThisQuizOnly}
        onUpdateAll={handleUpdateAllQuizzes}
      />

      {error && !autosaving && (
        <div className="fixed bottom-8 left-8 right-8 lg:left-auto lg:right-8 lg:w-96 bg-red-50 border-2 border-red-200 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-bold text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
