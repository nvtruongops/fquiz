'use client'

import * as React from 'react'
import { useState, useRef, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateHistoryForQuiz } from '@/lib/cache-invalidation'
import { analyzeQuizCompleteness } from '@/lib/quiz-analyzer'
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
  Loader2, AlertCircle, CheckCircle2, ChevronRight, 
  LayoutDashboard, History, AlertTriangle 
} from 'lucide-react'
import { ImageUpload } from './ImageUpload'
import { QuizImportPanel, ImportedQuiz } from './QuizImportPanel'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useQuestionBankWarning } from '@/hooks/useQuestionBankWarning'
import { QuestionBankWarning } from './QuestionBankWarning'
import { useQuestionBankCheck } from '@/hooks/useQuestionBankCheck'

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
    category_id: initialData?.category_id ?? '', // Không tự động chọn môn đầu tiên
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
  const [isImportProcessing, setIsImportProcessing] = useState(false)
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false)
  const [isInlineCreateOpen, setIsInlineCreateOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const autosaveInFlightRef = useRef(false)
  const importEnabled = process.env.NEXT_PUBLIC_ENABLE_QUIZ_IMPORT !== 'false'
  
  // Question Bank Warning
  const { checkQuestionUsage, usageInfo, clearUsageInfo } = useQuestionBankWarning(form.category_id)
  const [showBankWarning, setShowBankWarning] = useState(false)
  const [pendingQuestionUpdate, setPendingQuestionUpdate] = useState<{
    index: number
    field: 'text' | 'explanation' | 'image_url'
    value: string
  } | null>(null)
  
  // Question Bank Real-time Check
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
    debounceMs: 2000, // Check sau 2s không thay đổi
  })
  
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
  
  // Combined blocking state for submit button (no longer checking for base64 images)
  const isSubmitBlocked = saving || hasImportBlockingErrors || isImportProcessing
  
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
    
    // Skip autosave if import is processing
    if (isImportProcessing) return

    if (debouncedForm.category_id && debouncedForm.course_code) {
       handleAutosave()
    }
  }, [debouncedForm, isImportProcessing])

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
      // Sync targetCount with actual question count after removal
      setTargetCount(next.length)
      setTargetInput(String(next.length))
      return { ...prev, questions: next }
    })
  }

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

  const updateQuestion = async (qi: number, field: 'text' | 'explanation' | 'image_url', value: string) => {
    // Question Bank warning chỉ dành cho admin mode
    const isImportantChange = field === 'text' && !isStudentMode
    
    if (isImportantChange && form.category_id) {
      // Build the updated question
      const currentQuestion = form.questions[qi]
      const updatedQuestion = {
        text: field === 'text' ? value : currentQuestion.text,
        options: currentQuestion.options,
        correct_answer: currentQuestion.correct_answers,
        explanation: currentQuestion.explanation,
        image_url: currentQuestion.image_url,
      }
      
      // Check if question exists in Question Bank
      const usage = await checkQuestionUsage(updatedQuestion)
      
      if (usage && usage.exists && usage.usage_count && usage.usage_count > 1) {
        // Question is used in multiple quizzes - show warning
        setPendingQuestionUpdate({ index: qi, field, value })
        setShowBankWarning(true)
        return // Wait for user decision
      }
      
      // If question exists but only used in 1 quiz (this quiz)
      // Auto-update Question Bank without warning
      if (usage && usage.exists && usage.usage_count === 1) {
        // This will be handled by auto-sync after save
        // Just update the question normally
      }
    }
    
    // No warning needed - update directly
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

  // Question Bank Warning handlers
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
    // API already updated all quizzes
    // Just update local state
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

      // Auto-sync to Question Bank (CHỈ khi quiz được published, KHÔNG sync draft)
      // Draft quiz có thể chưa hoàn thiện, không nên đưa vào Question Bank
      if (!isStudentMode && form.category_id && savedQuizId && finalStatus === 'published') {
        try {
          await fetch('/api/question-bank/auto-sync', {
            method: 'POST',
            credentials: 'include',
            headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              category_id: form.category_id,
              course_code: form.course_code,
              questions: form.questions.map(q => ({
                text: q.text,
                options: q.options,
                correct_answer: q.correct_answers,
                explanation: q.explanation,
                image_url: q.image_url,
              })),
            }),
          })
          // Ignore errors - auto-sync is not critical
        } catch (error) {
          console.log('Auto-sync to Question Bank failed (non-critical):', error)
        }
      }

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
            </div>

            {/* BƯỚC 1: CHỌN MÔN HỌC (BẮT BUỘC) */}
            {!isStudentMode && (
              <Card className={cn(
                "bg-white border-2 shadow-lg",
                !form.category_id ? "border-orange-400 bg-orange-50" : "border-[#A4C3A2]"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-white",
                      !form.category_id ? "bg-orange-500" : "bg-[#5D7B6F]"
                    )}>
                      1
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-[#5D7B6F] text-lg">
                        Chọn Môn học {!form.category_id && <span className="text-red-600">*</span>}
                      </CardTitle>
                      {!form.category_id && (
                        <p className="text-xs text-orange-600 mt-1">
                           Bắt buộc: Vui lòng chọn môn học trước khi tiếp tục
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Select
                    value={form.category_id || undefined}
                    onValueChange={(v) => {
                      if (v && v !== '__placeholder__') {
                        setForm((p) => ({ ...p, category_id: v }))
                      }
                    }}
                  >
                    <SelectTrigger className={cn(
                      "h-14 rounded-xl text-base font-semibold",
                      !form.category_id 
                        ? "border-2 border-orange-400 bg-white text-gray-500" 
                        : "border-[#5D7B6F] bg-white text-[#5D7B6F]"
                    )}>
                      <SelectValue placeholder="— Chọn môn học để bắt đầu —" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categories.length === 0 ? (
                        <SelectItem value="__no_category__" disabled>
                          — Chưa có môn học —
                        </SelectItem>
                      ) : (
                        <>
                          <SelectItem value="__placeholder__" disabled className="text-gray-400">
                            — Chọn môn học —
                          </SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat._id} value={cat._id} className="font-medium text-gray-700">
                              {cat.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {/* Disable tất cả nếu chưa chọn môn học */}
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

            {/* Chỉ hiển thị phần còn lại khi đã chọn môn học (hoặc student mode) */}
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
              </>
            )}

            {/* Chỉ hiển thị form khi đã chọn môn học (hoặc student mode) */}
            {(isStudentMode || form.category_id) && (
              <>
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
                  {/* COURSE CODE - MÃ ĐỀ / MÃ QUIZ */}
                  <div className="p-4 rounded-xl bg-[#A4C3A2]/5 border border-[#A4C3A2]/20 shadow-sm">
                    <label className="block text-xs font-black uppercase tracking-widest text-[#5D7B6F] mb-3 flex items-center gap-1.5">
                      Mã đề / Mã Quiz
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

                  {/* DESCRIPTION */}
                  <div className="px-4">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-tight mb-1">
                      Mô tả chi tiết (tùy chọn)
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
                          type="number" min={1} max={isStudentMode ? 150 : 9999}
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

              {/* Conflict Summary Banner */}
              {bankCheck.result && bankCheck.hasDifferentAnswerConflicts && (
                <Card className="bg-red-50 border-red-300">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-red-900 mb-1">
                           Phát hiện {bankCheck.result.different_answer_conflicts} câu hỏi có mâu thuẫn đáp án!
                        </h3>
                        <p className="text-xs text-red-700">
                          Cùng câu hỏi + cùng options nhưng đáp án khác trong ngân hàng. Vui lòng kiểm tra lại.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {bankCheck.result && bankCheck.hasSameAnswerConflicts && !bankCheck.hasDifferentAnswerConflicts && (
                <Card className="bg-yellow-50 border-yellow-300">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-yellow-900 mb-1">
                          ✓ {bankCheck.result.same_answer_conflicts} câu hỏi đã có trong ngân hàng
                        </h3>
                        <p className="text-xs text-yellow-700">
                          Các câu hỏi này đã tồn tại với cùng đáp án. Có thể tái sử dụng an toàn.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Questions */}
              {form.questions.map((q, qi) => {
                const opts = effectiveOptions(q)
                const selectedCount = q.correct_answers.length
                
                const differentAnswerConflict = bankCheck.result?.conflicts.different_answer.find(c => c.questionIndex === qi)
                const sameAnswerConflict = bankCheck.result?.conflicts.same_answer.find(c => c.questionIndex === qi)
                const questionConflict = differentAnswerConflict || sameAnswerConflict
                const hasDifferentAnswer = !!differentAnswerConflict

                return (
                  <Card id={`q-card-${qi}`} key={qi} className={cn(
                    "bg-white border-[#A4C3A2] transition-all",
                    diagnostics.errors.some(e => e.questionIndex === qi) ? "border-red-200" : "",
                    hasDifferentAnswer ? "border-red-400 bg-red-50" : "",
                    questionConflict && !hasDifferentAnswer ? "border-yellow-400 bg-yellow-50" : ""
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
                          {hasDifferentAnswer && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[9px] uppercase font-black tracking-tighter">
                               Đáp án khác ngân hàng
                            </Badge>
                          )}
                          {questionConflict && !hasDifferentAnswer && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[9px] uppercase font-black tracking-tighter bg-yellow-100 text-yellow-800">
                              ✓ Đã có trong ngân hàng
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
                      {/* Conflict Details */}
                      {questionConflict && questionConflict.existingQuestion && (
                        <div className={cn(
                          "p-3 rounded-lg border",
                          hasDifferentAnswer ? "bg-red-100 border-red-300" : "bg-yellow-100 border-yellow-300"
                        )}>
                          <div className="flex items-start gap-2">
                            {hasDifferentAnswer
                              ? <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                              : <CheckCircle2 className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                            }
                            <div className="flex-1 text-xs">
                              <p className={cn("font-bold mb-1", hasDifferentAnswer ? "text-red-900" : "text-yellow-900")}>
                                {hasDifferentAnswer ? " Mâu thuẫn đáp án với ngân hàng" : "✓ Câu hỏi đã tồn tại trong ngân hàng"}
                              </p>
                              <p className={cn("mb-2", hasDifferentAnswer ? "text-red-700" : "text-yellow-700")}>
                                Mã đề: <span className="font-medium">{questionConflict.existingQuestion.used_in_quizzes.join(', ')}</span>
                                {' '}({questionConflict.existingQuestion.usage_count} quiz)
                              </p>
                              {hasDifferentAnswer && (
                                <div className="space-y-1 mt-2">
                                  <p className="font-medium text-red-800">Đáp án trong ngân hàng:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {questionConflict.existingQuestion.correct_answer.map((idx) => (
                                      <span key={idx} className="px-2 py-0.5 bg-red-200 text-red-900 rounded font-medium">
                                        {questionConflict.existingQuestion!.options[idx] || OPTION_LABELS[idx]}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="font-medium text-red-800 mt-1">Đáp án hiện tại:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {q.correct_answers.map((idx) => (
                                      <span key={idx} className="px-2 py-0.5 bg-red-200 text-red-900 rounded font-medium">
                                        {q.options[idx] || OPTION_LABELS[idx]}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
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
                <Button type="submit" disabled={isSubmitBlocked} className="bg-[#5D7B6F] hover:bg-[#5D7B6F]/90">
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang lưu...
                    </div>
                  ) : isImportProcessing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý import...
                    </div>
                  ) : quizId ? 'Cập nhật Quiz' : (isStudentMode ? 'Tạo Quiz' : 'Tạo & Công khai')}
                </Button>
                {canSaveDraft && (
                  <Button type="button" variant="outline" disabled={isSubmitBlocked} onClick={handleSaveDraft}
                    className="border-[#5D7B6F] text-[#5D7B6F] hover:bg-[#5D7B6F]/5">
                    Lưu bản nháp
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={() => router.push(effectiveCancelPath)}>
                  Hủy
                </Button>
              </div>
            </form>
              </>
            )}
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

      {/* Question Bank Warning Dialog - chỉ hiện cho admin */}
      {!isStudentMode && showBankWarning && usageInfo && usageInfo.exists && pendingQuestionUpdate && (
        <QuestionBankWarning
          open={showBankWarning}
          onOpenChange={setShowBankWarning}
          categoryId={form.category_id}
          oldQuestionId={usageInfo.question_id!}
          newQuestion={{
            text: pendingQuestionUpdate.field === 'text' 
              ? pendingQuestionUpdate.value 
              : form.questions[pendingQuestionUpdate.index].text,
            options: form.questions[pendingQuestionUpdate.index].options,
            correct_answer: form.questions[pendingQuestionUpdate.index].correct_answers,
            explanation: form.questions[pendingQuestionUpdate.index].explanation,
            image_url: form.questions[pendingQuestionUpdate.index].image_url,
          }}
          usageInfo={{
            usage_count: usageInfo.usage_count!,
            used_in_quizzes: usageInfo.used_in_quizzes!,
            bank_answer: usageInfo.bank_answer!,
          }}
          onUpdateAll={handleUpdateAllQuizzes}
          onUpdateThisOnly={handleUpdateThisQuizOnly}
        />
      )}
    </div>
  )
}
