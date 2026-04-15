'use client'

import * as React from 'react'
import { useState, useRef, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateHistoryForQuiz } from '@/lib/cache-invalidation'
import { analyzeQuizCompleteness, QuizDiagnostics, ValidationError } from '@/lib/quiz-analyzer'
import { useDebounce } from '@/hooks/useDebounce'
import { useToast } from '@/lib/store/toast-store'
import { withCsrfHeaders } from '@/lib/csrf'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, Trash2, Hash, ChevronUp, ChevronDown, ImageIcon, 
  Upload, Loader2, AlertCircle, CheckCircle2, ChevronRight, 
  X, LayoutDashboard, History, AlertTriangle 
} from 'lucide-react'
import { ImageUpload } from './ImageUpload'
import { QuizImportPanel, ImportedQuiz } from './QuizImportPanel'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']
const DEFAULT_OPTION_COUNT = 4

interface QuestionForm {
  text: string
  options: string[]
  correct_answers: number[]   // multi-answer
  explanation: string
  image_url: string
}

interface QuizFormData {
  description: string
  category_id: string
  course_code: string
  questions: QuestionForm[]
  status: 'published' | 'draft'
}

interface Category {
  _id: string
  name: string
}

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

function extractApiErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (Array.isArray(error)) {
    const firstIssue = error[0] as { message?: unknown; path?: unknown[] } | undefined
    if (firstIssue && typeof firstIssue.message === 'string') {
      const path = Array.isArray(firstIssue.path) && firstIssue.path.length > 0 ? String(firstIssue.path.join('.')) : ''
      return path ? `${path}: ${firstIssue.message}` : firstIssue.message
    }
    return 'Dữ liệu không hợp lệ'
  }
  if (!error || typeof error !== 'object') return 'Lưu thất bại'
  const flat = error as { fieldErrors?: Record<string, string[] | undefined>; formErrors?: string[] }
  const fieldMessages = Object.values(flat.fieldErrors ?? {})
    .flat()
    .filter((msg): msg is string => Boolean(msg))
  const formMessages = (flat.formErrors ?? []).filter(Boolean)
  const all = [...fieldMessages, ...formMessages]
  return all.length > 0 ? all[0] : 'Lưu thất bại'
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
  const effectiveCreateEndpoint =
    createEndpoint ??
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${isStudentMode ? '/api/student/quizzes' : '/api/admin/quizzes'}`
  const effectiveUpdateEndpointBuilder = updateEndpointBuilder ?? ((id: string) =>
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${isStudentMode ? `/api/student/quizzes/${id}` : `/api/admin/quizzes/${id}`}`
  )
  const effectiveRedirectOnPublish = redirectOnPublish ?? (isStudentMode ? '/my-quizzes' : '/admin/quizzes')
  const effectiveCancelPath = cancelPath ?? (isStudentMode ? '/my-quizzes' : '/admin/quizzes')

  const [form, setForm] = useState<QuizFormData>(() => ({
    description: (initialData as any)?.description ?? '',
    category_id: initialData?.category_id ?? categories[0]?._id ?? '',
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
  const [confirmDialog, setConfirmDialog] = useState(false)
  const [hasImportBlockingErrors, setHasImportBlockingErrors] = useState(false)
  const [importPreviewErrors, setImportPreviewErrors] = useState<Array<{ code: string; message: string; questionIndex?: number }>>([])
  const [showImportPanel, setShowImportPanel] = useState(false)
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false)
  const [isInlineCreateOpen, setIsInlineCreateOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const autosaveInFlightRef = useRef(false)
  const importEnabled = process.env.NEXT_PUBLIC_ENABLE_QUIZ_IMPORT !== 'false'
  
  // Real-time diagnostics
  const diagnostics = useMemo(() => analyzeQuizCompleteness({ ...form, course_code: form.course_code } as any, targetCount), [form, targetCount])
  const combinedErrors = useMemo(
    () => [
      ...diagnostics.errors,
      ...importPreviewErrors.map((item) => ({
        code: item.code as any,
        severity: 'error' as const,
        message: item.message,
        questionIndex: item.questionIndex,
      })),
    ],
    [diagnostics.errors, importPreviewErrors]
  )
  
  // Autosave Logic
  const debouncedForm = useDebounce(form, 3000)
  const pendingSubmit = useRef<(() => Promise<void>) | null>(null)
  const isFirstLoad = useRef(true)

  useEffect(() => {
    if (!autosaveEnabled) return
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }
    // Skip autosave if any question has a pending base64 image (not yet uploaded)
    const hasPendingBase64 = debouncedForm.questions.some(q => q.image_url?.startsWith('data:image'))
    if (hasPendingBase64) return

    if (debouncedForm.category_id && debouncedForm.course_code) {
       handleAutosave()
    }
  }, [debouncedForm])

  const handleAutosave = async () => {
    if (autosaveInFlightRef.current) return
    autosaveInFlightRef.current = true
    setAutosaving(true)
    try {
      // Keep current status for existing quizzes; only new quiz autosaves as draft.
      await doSave(activeQuizId ? form.status : 'draft', true)
    } finally {
      setAutosaving(false)
      autosaveInFlightRef.current = false
    }
  }

  // ── Question count ─────────────────────────────────────────────────────────

  function applyTargetCount(raw: string) {
    const n = Math.max(1, Math.min(200, parseInt(raw) || 1))
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

  const removeQuestion = (qi: number) =>
    setForm((prev) => {
      if (prev.questions.length <= 1) return prev
      return { ...prev, questions: prev.questions.filter((_, i) => i !== qi) }
    })

  // ── Option management ──────────────────────────────────────────────────────

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

  const updateQuestion = (qi: number, field: 'text' | 'explanation' | 'image_url', value: string) =>
    setForm((prev) => {
      const questions = [...prev.questions]
      questions[qi] = { ...questions[qi], [field]: value }
      return { ...prev, questions }
    })

  const removeQuestionImage = (qi: number) =>
    setForm((prev) => {
      const questions = [...prev.questions]
      questions[qi] = { ...questions[qi], image_url: '' }
      return { ...prev, questions }
    })

  function effectiveOptions(q: QuestionForm): string[] {
    let last = q.options.length - 1
    while (last > 1 && !q.options[last].trim()) last--
    return q.options.slice(0, last + 1)
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  const doSave = async (overrideStatus?: 'published' | 'draft', quiet: boolean = false) => {
    // If manual save, wait for any in-flight autosave to finish first
    if (!quiet && autosaveInFlightRef.current) {
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (!autosaveInFlightRef.current) {
            clearInterval(interval)
            resolve()
          }
        }, 100)
      })
    }
    if (!quiet) setSaving(true)
    setError('')
    const finalStatus = isStudentMode ? 'published' : (overrideStatus ?? form.status)
    const normalizedCourseCode = form.course_code.trim().toUpperCase()
    const payload = {
      description: form.description.trim(),
      category_id: form.category_id,
      course_code: normalizedCourseCode || 'GENERAL',
      status: finalStatus,
      lastUpdatedAt, 
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
    try {
      const url = activeQuizId ? effectiveUpdateEndpointBuilder(activeQuizId) : effectiveCreateEndpoint
      const res = await fetch(url, {
        method: activeQuizId ? (isStudentMode ? 'PATCH' : 'PUT') : 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      
      if (!res.ok) { 
        if (data.code === 'CONCURRENCY_ERROR') {
          setError('Xung đột dữ liệu. Có người vừa chỉnh sửa quiz này. Hãy tải lại trang.')
          toast.error('Xung đột dữ liệu! Vui lòng làm mới trang.')
          return
        }
        setError(extractApiErrorMessage(data.error))
        return 
      }

      const savedQuizId = data?.quiz?._id ? String(data.quiz._id) : activeQuizId
      if (savedQuizId) {
        setActiveQuizId(savedQuizId)
      }
      if (data?.quiz?.status && (data.quiz.status === 'published' || data.quiz.status === 'draft')) {
        setForm((prev) => ({ ...prev, status: data.quiz.status }))
      }
      setLastUpdatedAt(data.quiz.updatedAt)
      setLastSavedAt(new Date())

      if (!quiet) {
        if (savedQuizId) await invalidateHistoryForQuiz(queryClient, savedQuizId)
        if (finalStatus === 'published') {
            toast.success(isStudentMode ? 'Đã tạo quiz thành công!' : 'Đã công khai quiz thành công!')
            router.push(effectiveRedirectOnPublish)
           router.refresh()
        } else {
           toast.success('Đã lưu bản nháp')
        }
      }
    } catch {
      if (!quiet) setError('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      if (!quiet) setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (hasImportBlockingErrors) {
      setError('File import van con loi. Vui long sua loi trong preview truoc khi luu.')
      return
    }
    if (!diagnostics.isValid) {
      setError('Vui lòng hoàn thiện các thông tin còn thiếu trước khi công khai.')
      scrollToQuestion(diagnostics.errors[0]?.questionIndex ?? 0)
      return
    }
    await doSave('published')
  }

  const handleSaveDraft = async () => {
    if (!canSaveDraft) return
    if (hasImportBlockingErrors) {
      setError('File import van con loi. Vui long sua loi trong preview truoc khi luu.')
      return
    }
    await doSave('draft')
  }

  const handleCreateCategoryQuick = async () => {
    if (!isStudentMode) return
    const name = newCategoryName.trim()
    if (!name) return

    setIsCreatingCategory(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/categories`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Không thể tạo danh mục')
      }

      queryClient.invalidateQueries({ queryKey: ['student', 'categories'] })
      if (data?.category?._id) {
        setForm((prev) => ({ ...prev, category_id: String(data.category._id) }))
      }
      setIsInlineCreateOpen(false)
      setIsCategorySelectOpen(false)
      setNewCategoryName('')
      toast.success('Đã tạo danh mục cá nhân')
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo danh mục')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const scrollToQuestion = (idx: number) => {
    const el = document.getElementById(`q-card-${idx}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-red-500', 'ring-offset-2')
      setTimeout(() => el.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2'), 2000)
    }
  }

  const actual = form.questions.length

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
        // course_code is optional in import file; keep existing value when missing.
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

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 w-full space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-[#5D7B6F]">
                {quizId ? 'Chỉnh sửa Quiz' : 'Tạo Quiz mới'}
              </h1>
              {importEnabled && (
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
              )}
            </div>

            {importEnabled && showImportPanel && (
              <QuizImportPanel
                onApply={handleApplyImportedQuiz}
                onValidationStateChange={setHasImportBlockingErrors}
                onPreviewDiagnosticsChange={(errors) =>
                  setImportPreviewErrors(errors.map((item) => ({ code: item.code, message: item.message, questionIndex: item.questionIndex })))
                }
              />
            )}

            {/* PROGRESS HUB */}
            <Card className="bg-white border-[#A4C3A2] shadow-sm overflow-hidden">
              <div className="p-4 bg-[#A4C3A2]/10 border-b border-[#A4C3A2]/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-[#5D7B6F]" />
                  <span className="text-sm font-bold text-[#5D7B6F]">Bảng điều khiển hoàn thiện</span>
                </div>
                <div className="flex items-center gap-4">
                  {autosaving ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Đang tự động lưu...
                    </div>
                  ) : lastSavedAt ? (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <History className="w-3 h-3" />
                      Đã lưu lúc {lastSavedAt.toLocaleTimeString()}
                    </div>
                  ) : null}
                  <Badge variant={diagnostics.isValid && !hasImportBlockingErrors ? 'default' : 'secondary'} className={cn(
                    "text-[10px] uppercase font-bold",
                    diagnostics.isValid && !hasImportBlockingErrors ? "bg-[#5D7B6F]" : "bg-orange-400"
                  )}>
                    {diagnostics.isValid && !hasImportBlockingErrors ? 'Sẵn sàng công khai' : 'Bản nháp'}
                  </Badge>
                </div>
              </div>
              <CardContent className="pt-6 pb-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <div className="flex justify-between text-xs font-bold">
                          <span className="text-gray-500 uppercase tracking-tight">Tiến độ tổng thể</span>
                          <span className="text-[#5D7B6F] font-mono">{diagnostics.progressPercent}%</span>
                       </div>
                       <Progress value={diagnostics.progressPercent} className="h-2 bg-gray-100" />
                    </div>
                    
                    <div className="flex items-center gap-4 border-l pl-6 border-gray-100">
                       <div className="text-center">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Câu hỏi</p>
                          <p className="text-xl font-black text-gray-900">{diagnostics.summary.completedQuestions}<span className="text-gray-300 text-sm font-normal">/{targetCount}</span></p>
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Lỗi</p>
                          <p className={cn("text-xl font-black", combinedErrors.length > 0 ? "text-red-500" : "text-gray-300")}>{combinedErrors.length}</p>
                       </div>
                    </div>

                    <div className="flex items-center gap-2 border-l pl-6 border-gray-100">
                       {diagnostics.isValid ? (
                         <div className="flex items-center gap-2 text-[#5D7B6F]">
                            <CheckCircle2 className="w-5 h-5" />
                            <p className="text-xs font-bold">Nội dung đã sẵn sàng!</p>
                         </div>
                       ) : (
                         <div className="flex items-center gap-2 text-orange-500">
                            <AlertCircle className="w-5 h-5" />
                            <p className="text-xs font-bold">Cần hoàn thiện thêm</p>
                         </div>
                       )}
                    </div>
                 </div>
              </CardContent>
            </Card>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Quiz Details */}
              <Card className={cn(
                "bg-white border-[#A4C3A2]",
                diagnostics.errors.some(e => ['MISSING_CATEGORY', 'MISSING_COURSE_CODE'].includes(e.code)) ? "ring-1 ring-red-500" : ""
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-[#5D7B6F]" />
                    <CardTitle className="text-[#5D7B6F] text-lg">Phân loại & Thông tin</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* CATEGORY - PRIMARY (MÔN HỌC) */}
                    <div className="p-4 rounded-xl bg-[#A4C3A2]/5 border border-[#A4C3A2]/20 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <label className="text-xs font-black uppercase tracking-widest text-[#5D7B6F] flex items-center gap-1.5">
                          1. Môn học
                          {diagnostics.errors.some(e => e.code === 'MISSING_CATEGORY') && <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />}
                        </label>
                      </div>
                      <Select
                        open={isCategorySelectOpen}
                        value={form.category_id}
                        onOpenChange={(open) => {
                          setIsCategorySelectOpen(open)
                          if (!open) setIsInlineCreateOpen(false)
                        }}
                        onValueChange={(v) => setForm((p) => ({ ...p, category_id: v }))}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-gray-200 focus:border-[#5D7B6F] focus:ring-[#5D7B6F]/30 bg-white text-base font-semibold text-[#5D7B6F]">
                          <SelectValue placeholder="— Chọn môn học —" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {categories.length === 0 && (
                            <SelectItem value="__no_category__" disabled>— Chưa có môn học —</SelectItem>
                          )}
                          {categories.map((cat) => (
                            <SelectItem key={cat._id} value={cat._id} className="font-medium text-gray-700">{cat.name}</SelectItem>
                          ))}
                          {isStudentMode && (
                            <div className="border-t mt-2 pt-2 px-2 space-y-2">
                              {categories.length >= 5 ? (
                                <p className="text-[11px] font-medium text-amber-600 px-2 py-1">
                                  Đã đạt giới hạn 5 danh mục cá nhân.
                                </p>
                              ) : (
                                <>
                                  {!isInlineCreateOpen ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="w-full h-8 justify-center px-2 text-[12px] font-bold text-[#5D7B6F]"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => setIsInlineCreateOpen(true)}
                                    >
                                      + Tạo danh mục mới
                                    </Button>
                                  ) : (
                                    <div className="px-1 pb-1">
                                      <div className="flex items-center gap-2">
                                        <Input
                                          value={newCategoryName}
                                          onChange={(e) => setNewCategoryName(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault()
                                              void handleCreateCategoryQuick()
                                            }
                                          }}
                                          placeholder="Tên danh mục mới"
                                          className="h-8 text-sm"
                                          onMouseDown={(e) => e.stopPropagation()}
                                        />
                                        <Button
                                          type="button"
                                          size="sm"
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => void handleCreateCategoryQuick()}
                                          disabled={isCreatingCategory || !newCategoryName.trim()}
                                          className="h-8 px-3 bg-[#5D7B6F] hover:bg-[#5D7B6F]/90"
                                        >
                                          {isCreatingCategory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Tạo'}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* COURSE CODE - MÃ ĐỀ / MÃ QUIZ */}
                    <div className="p-4 rounded-xl bg-[#A4C3A2]/5 border border-[#A4C3A2]/20 shadow-sm">
                      <label className="block text-xs font-black uppercase tracking-widest text-[#5D7B6F] mb-3 flex items-center gap-1.5">
                        2. Mã đề / Mã Quiz
                        {diagnostics.errors.some(e => e.code === 'MISSING_COURSE_CODE') && <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />}
                      </label>
                      <Input
                        value={form.course_code}
                        onChange={(e) => setForm((p) => ({ ...p, course_code: e.target.value }))}
                        placeholder="VD: ABC_123, HK1_DE01..."
                        className={cn(
                          "h-12 rounded-xl border-gray-200 focus:border-[#5D7B6F] focus:ring-[#5D7B6F]/30 bg-white text-base font-semibold text-[#5D7B6F]",
                          form.course_code && !/^[a-zA-Z0-9_]+$/.test(form.course_code) && "border-red-500 focus:border-red-500"
                        )}
                      />
                      {form.course_code && !/^[a-zA-Z0-9_]+$/.test(form.course_code) && (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Mã đề chỉ được chứa chữ cái, số và dấu gạch dưới (_)
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Chỉ dùng chữ cái (A-Z), số (0-9) và dấu gạch dưới (_). Không dấu cách.
                      </p>
                    </div>
                  </div>

                  {/* DESCRIPTION */}
                  <div className="px-4">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-tight mb-1">
                      3. Mô tả chi tiết (tùy chọn)
                    </label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Mô tả nội dung, phạm vi kiến thức hoặc hướng dẫn cho người làm bài..."
                      autoResize
                      className="text-sm border-0 border-b rounded-none shadow-none px-0 focus-visible:ring-0 focus-visible:border-b-2 focus-visible:border-[#5D7B6F] placeholder:text-gray-300"
                    />
                  </div>

                  {/* Target count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                      Số câu hỏi mục tiêu
                      {diagnostics.errors.some(e => e.code === 'TARGET_MISMATCH') && <AlertTriangle className="w-3 h-3 text-orange-500" />}
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-input rounded-md overflow-hidden">
                        <button 
                          type="button" 
                          onClick={() => applyTargetCount(String(targetCount - 1))}
                          title="Giảm số câu mục tiêu"
                          className="px-3 py-2 hover:bg-gray-50 text-gray-500 border-r border-input"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <input
                          type="number" min={1} max={200}
                          value={targetInput}
                          title="Nhập số câu mục tiêu"
                          onChange={(e) => setTargetInput(e.target.value)}
                          onBlur={(e) => applyTargetCount(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyTargetCount(targetInput))}
                          className="w-20 text-center py-2 text-sm outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button 
                          type="button" 
                          onClick={() => applyTargetCount(String(targetCount + 1))}
                          title="Tăng số câu mục tiêu"
                          className="px-3 py-2 hover:bg-gray-50 text-gray-500 border-l border-input"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                      </div>
                      <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
                        actual < targetCount ? "bg-orange-50 text-orange-600 border border-orange-200"
                        : actual > targetCount ? "bg-blue-50 text-blue-600 border border-blue-200"
                        : "bg-[#A4C3A2]/30 text-[#5D7B6F] border border-[#A4C3A2]"
                      )}>
                        <Hash className="w-3.5 h-3.5" />
                        {actual} / {targetCount} câu
                        {actual < targetCount && ` (thiếu ${targetCount - actual})`}
                        {actual > targetCount && ` (+${actual - targetCount})`}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Nhập số rồi nhấn Enter để tạo nhanh danh sách câu hỏi</p>
                  </div>
                </CardContent>
              </Card>

              {/* Questions */}
              {form.questions.map((q, qi) => {
                const opts = effectiveOptions(q)
                const selectedCount = q.correct_answers.length

                return (
                  <Card id={`q-card-${qi}`} key={qi} className={cn(
                    "bg-white border-[#A4C3A2] transition-all",
                    diagnostics.errors.some(e => e.questionIndex === qi) ? "border-red-200" : ""
                  )}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-[#5D7B6F] text-sm font-semibold">
                            Câu {qi + 1}
                          </CardTitle>
                          {selectedCount > 0 && (
                            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                              Chọn {selectedCount} đáp án
                            </span>
                          )}
                          {diagnostics.errors.some(e => e.questionIndex === qi) && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[9px] uppercase font-black tracking-tighter">
                              Chưa hoàn thiện
                            </Badge>
                          )}
                        </div>
                        {form.questions.length > 1 && (
                          <Button type="button" size="icon" variant="ghost" onClick={() => removeQuestion(qi)}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      <div>
                        <Textarea
                          value={q.text}
                          onChange={(e) => updateQuestion(qi, 'text', e.target.value)}
                          placeholder={`Nội dung câu ${qi + 1}...`}
                          className={cn(
                            "min-h-[40px] text-base font-medium",
                            !q.text.trim() && "border-red-200 focus:border-red-400"
                          )}
                          autoResize
                        />
                        {!q.text.trim() && (
                          <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1 animate-pulse">
                            <AlertCircle className="w-3 h-3" />
                            Bắt buộc: Nội dung câu hỏi
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-500">
                            Đáp án — click ô vuông để chọn đáp án đúng
                            {selectedCount > 0 && (
                              <span className="ml-1 text-blue-500 font-medium">
                                (đã chọn {selectedCount})
                              </span>
                            )}
                          </p>
                          <span className="text-xs text-gray-400">{opts.length}/6</span>
                        </div>

                        <div className="space-y-2">
                          {q.options.map((opt, oi) => {
                            const isCorrect = q.correct_answers.includes(oi)
                            const label = OPTION_LABELS[oi] ?? String(oi + 1)
                            return (
                              <div key={oi} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleCorrect(qi, oi)}
                                  title={`Đáp án ${label} ${isCorrect ? 'đúng' : 'sai'}`}
                                  className={cn(
                                    "w-7 h-7 flex-shrink-0 rounded-md border-2 flex items-center justify-center text-xs font-bold transition-colors",
                                    isCorrect ? "bg-[#5D7B6F] border-[#5D7B6F] text-white" : "border-gray-300 text-gray-400 hover:border-[#5D7B6F] hover:text-[#5D7B6F]"
                                  )}
                                >
                                  {label}
                                </button>

                                <Input
                                  value={opt}
                                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                                  placeholder={`Đáp án ${label}`}
                                  className={cn(
                                    "flex-1 transition-colors",
                                    isCorrect ? "border-[#A4C3A2] bg-[#A4C3A2]/10" : "",
                                    !opt.trim() && oi < 2 ? "border-red-200" : ""
                                  )}
                                />

                                {q.options.length > 2 && (
                                  <Button type="button" size="icon" variant="ghost"
                                    onClick={() => removeOption(qi, oi)}
                                    title={`Xóa đáp án ${label}`}>
                                    <Trash2 className="h-3 w-3 text-red-300" />
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        
                        {q.correct_answers.length === 0 && (
                          <p className="text-[10px] text-red-500 font-bold mt-2 flex items-center gap-1 animate-pulse pl-9">
                            <AlertTriangle className="w-3 h-3" />
                            Lỗi: Chưa chọn đáp án đúng cho câu này
                          </p>
                        )}

                        {q.options.length < 6 && (
                          <Button type="button" size="sm" variant="outline"
                            className="mt-2 h-7 text-xs" onClick={() => addOption(qi)}>
                            <Plus className="h-3 w-3 mr-1" />
                            Thêm đáp án
                          </Button>
                        )}
                      </div>

                      <Textarea
                        value={q.explanation}
                        onChange={(e) => updateQuestion(qi, 'explanation', e.target.value)}
                        placeholder="Giải thích đáp án (không bắt buộc)"
                        className="text-sm min-h-[80px]"
                        autoResize
                      />
                      
                      <div className="pt-2">
                        <label className="text-xs font-medium text-gray-500 mb-2 block flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5" />
                          Hình ảnh minh họa
                        </label>
                        <ImageUpload
                          value={q.image_url}
                          onChange={(url) => updateQuestion(qi, 'image_url', url)}
                          onRemove={() => removeQuestionImage(qi)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              <Button type="button" variant="outline" onClick={addQuestion}
                className="w-full border-dashed border-[#5D7B6F] text-[#5D7B6F] hover:bg-[#5D7B6F]/5">
                <Plus className="h-4 w-4 mr-1" />
                Thêm câu hỏi ({actual} câu)
              </Button>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
              )}

              <div className="flex gap-3 pb-8">
                <Button type="submit" disabled={saving || hasImportBlockingErrors} className="bg-[#5D7B6F] hover:bg-[#5D7B6F]/90">
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {form.questions.some(q => q.image_url?.startsWith('data:image')) 
                        ? 'Đang tải ảnh & Lưu...' 
                        : 'Đang lưu...'}
                    </div>
                  ) : quizId ? 'Cập nhật Quiz' : (isStudentMode ? 'Tạo Quiz' : 'Tạo & Công khai')}
                </Button>
                {canSaveDraft && (
                  <Button type="button" variant="outline" disabled={saving || hasImportBlockingErrors} onClick={handleSaveDraft}
                    className="border-[#5D7B6F] text-[#5D7B6F] hover:bg-[#5D7B6F]/5">
                    Lưu bản nháp
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={() => router.push(effectiveCancelPath)}>
                  Hủy
                </Button>
              </div>
            </form>
          </div>

          {/* ISSUE NAVIGATOR SIDEBAR */}
          <div className="hidden lg:block w-72 h-[calc(100vh-8rem)] sticky top-32 space-y-4">
              <Card className="bg-white border-[#A4C3A2] h-full flex flex-col shadow-sm">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-gray-500" />
                      <span className="text-xs font-black uppercase tracking-widest text-gray-500">Danh sách lỗi</span>
                   </div>
                   <Badge variant="outline" className="h-5 text-[9px] font-bold">{combinedErrors.length}</Badge>
                </div>
                
                <ScrollArea className="flex-1 p-2">
                  {combinedErrors.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 opacity-50 pt-20">
                       <CheckCircle2 className="w-10 h-10 text-[#5D7B6F]" />
                       <p className="text-xs font-bold text-gray-900">Mọi thứ đều hoàn hảo!</p>
                    </div>
                  ) : (
                    <div className="space-y-4 pr-1">
                      {Array.from(new Set(combinedErrors.map(e => e.code))).map(code => {
                        const group = combinedErrors.filter(e => e.code === code)
                        const isTargetMismatch = code === 'TARGET_MISMATCH'
                        
                        return (
                          <div key={code} className="space-y-1.5">
                             <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">{code.replace(/_/g, ' ')} ({group.length})</span>
                                {isTargetMismatch && (
                                   <Button 
                                     variant="link" 
                                     className="h-auto p-0 text-[10px] font-bold text-blue-600 hover:text-blue-700"
                                     onClick={(e) => {
                                       e.preventDefault()
                                       applyTargetCount(String(actual))
                                     }}
                                   >
                                     Sửa ngay
                                   </Button>
                                )}
                             </div>
                             <div className="space-y-1">
                                {group.map((err, ei) => (
                                  <button
                                    key={ei}
                                    type="button"
                                    onClick={() => {
                                      if (err.questionIndex !== undefined) {
                                        scrollToQuestion(err.questionIndex)
                                        } else if (err.code === 'MISSING_CATEGORY') {
                                         window.scrollTo({ top: 0, behavior: 'smooth' })
                                      }
                                    }}
                                    className="w-full text-left p-2 rounded-lg bg-red-50/50 border border-transparent hover:border-red-200 hover:bg-red-50 transition-all flex items-start gap-2 group"
                                  >
                                    <div className="w-4 h-4 rounded bg-red-200 flex items-center justify-center text-[10px] font-bold text-red-700 flex-shrink-0 mt-0.5">
                                      {err.questionIndex !== undefined ? err.questionIndex + 1 : '!'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <p className="text-[11px] font-medium text-gray-700 leading-tight truncate group-hover:text-red-700">{err.message}</p>
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-red-300 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                ))}
                             </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </Card>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận tạo Quiz</DialogTitle>
            <DialogDescription>
              Bạn đặt mục tiêu <span className="font-semibold text-gray-800">{targetCount} câu</span>, 
              nhưng hiện chỉ có <span className="font-semibold text-orange-600">{actual} câu</span>.
              <br /><br />
              Quiz sẽ được tạo với <span className="font-semibold">{actual} câu hỏi</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>Quay lại</Button>
            <Button className="bg-[#5D7B6F] hover:bg-[#5D7B6F]/90" disabled={saving}
              onClick={async () => { setConfirmDialog(false); if (pendingSubmit.current) await pendingSubmit.current() }}>
              Tạo {actual} câu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
