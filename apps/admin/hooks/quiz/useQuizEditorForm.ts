import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/useToast'
import { useQuizDiagnostics } from './useQuizDiagnostics'
import type { QuestionItem, QuizDiagnostics } from './types'

interface UseQuizEditorFormProps {
  initialData?: any
  quizId?: string
}

export function useQuizEditorForm({ initialData, quizId }: UseQuizEditorFormProps) {
  const router = useRouter()
  const [courseCode, setCourseCode] = useState(initialData?.course_code || '')
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [targetCount, setTargetCount] = useState<number | ''>('')

  // Course Code Duplicate Checking State
  const [isCheckingCode, setIsCheckingCode] = useState(false)
  const [codeDuplicateInfo, setCodeDuplicateInfo] = useState<{
    exists: boolean
    quiz?: { title: string; course_code: string; questionCount: number }
  } | null>(null)

  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    if (initialData?.questions && Array.isArray(initialData.questions) && initialData.questions.length > 0) {
      return initialData.questions.map((q: any) => ({
        question_id: q.question_id || '',
        text: q.text || '',
        options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['', '', '', ''],
        correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer : [0],
        explanation: q.explanation || '',
        image_url: q.image_url || '',
      }))
    }
    return [
      {
        text: '',
        options: ['', '', '', ''],
        correct_answer: [0],
        explanation: '',
      },
    ]
  })

  // Question Bank Background Status
  const [isCheckingBank, setIsCheckingBank] = useState(false)
  const [bankStatus, setBankStatus] = useState<{
    checked: boolean
    hasConflicts: boolean
    conflicts: any[]
  }>({
    checked: false,
    hasConflicts: false,
    conflicts: [],
  })

  const [showConflictModal, setShowConflictModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitAction, setSubmitAction] = useState<'published' | 'draft'>('published')

  const isCategorySelected = Boolean(categoryId)

  // Real-time course_code duplicate checker (debounce 150ms)
  const checkCodeNow = useCallback(
    async (codeToTest: string) => {
      const trimmed = codeToTest.trim()
      if (!trimmed) {
        setCodeDuplicateInfo(null)
        setIsCheckingCode(false)
        return
      }

      if (initialData?.course_code && trimmed.toUpperCase() === initialData.course_code.toUpperCase()) {
        setCodeDuplicateInfo({ exists: false })
        setIsCheckingCode(false)
        return
      }

      setIsCheckingCode(true)
      try {
        const excludeParam = quizId ? `&excludeId=${encodeURIComponent(quizId)}` : ''
        const res = await fetch(
          `/api/quizzes/check-code?code=${encodeURIComponent(trimmed)}${excludeParam}&_t=${Date.now()}`,
          {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
          }
        )
        if (res.ok) {
          const data = await res.json()
          setCodeDuplicateInfo(data)
        }
      } catch (err) {
        console.warn('Check code error:', err)
      } finally {
        setIsCheckingCode(false)
      }
    },
    [quizId, initialData?.course_code]
  )

  useEffect(() => {
    const trimmed = courseCode.trim()
    if (!trimmed) {
      setCodeDuplicateInfo(null)
      return
    }

    const timer = setTimeout(() => {
      checkCodeNow(trimmed)
    }, 150)

    return () => clearTimeout(timer)
  }, [courseCode, checkCodeNow])

  // Diagnostics Calculation
  const diagnostics: QuizDiagnostics = useQuizDiagnostics({
    questions,
    courseCode,
    categoryId,
    codeDuplicateInfo,
  })

  // Question Bank Debounced Check
  useEffect(() => {
    if (!categoryId || questions.length === 0) {
      setBankStatus({ checked: false, hasConflicts: false, conflicts: [] })
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingBank(true)
        const res = await fetch(`/api/question-bank/conflicts?category_id=${categoryId}`, {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          const conflicts = data.conflicts || []
          setBankStatus({
            checked: true,
            hasConflicts: conflicts.length > 0,
            conflicts,
          })
        }
      } catch {
        // Non-blocking background check
      } finally {
        setIsCheckingBank(false)
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [categoryId, questions.length])

  // Scroll to question helper
  function scrollToQuestion(index: number) {
    const el = document.getElementById(`question-card-${index}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-primary')
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 2000)
    }
  }

  // Question manipulations
  function handleAddQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        text: '',
        options: ['', '', '', ''],
        correct_answer: [0],
        explanation: '',
      },
    ])
  }

  function handleMoveQuestion(index: number, direction: 'up' | 'down') {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === questions.length - 1)) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    setQuestions((prev) => {
      const clone = [...prev]
      const temp = clone[index]
      clone[index] = clone[targetIndex]
      clone[targetIndex] = temp
      return clone
    })
  }

  function handleRemoveQuestion(index: number) {
    if (questions.length <= 1) {
      toast({ title: 'Cảnh báo', description: 'Đề thi phải có ít nhất 1 câu hỏi', type: 'warning' })
      return
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  function handleUpdateQuestionText(index: number, text: string) {
    setQuestions((prev) => {
      const clone = [...prev]
      clone[index] = { ...clone[index], text }
      return clone
    })
  }

  function handleUpdateOption(qIndex: number, optIndex: number, val: string) {
    setQuestions((prev) => {
      const clone = [...prev]
      const updatedOpts = [...clone[qIndex].options]
      updatedOpts[optIndex] = val
      clone[qIndex] = { ...clone[qIndex], options: updatedOpts }
      return clone
    })
  }

  function handleAddOption(qIndex: number) {
    setQuestions((prev) => {
      const clone = [...prev]
      if (clone[qIndex].options.length >= 8) return clone
      clone[qIndex] = { ...clone[qIndex], options: [...clone[qIndex].options, ''] }
      return clone
    })
  }

  function handleRemoveOption(qIndex: number, optIndex: number) {
    setQuestions((prev) => {
      const clone = [...prev]
      if (clone[qIndex].options.length <= 2) {
        toast({ title: 'Cảnh báo', description: 'Mỗi câu hỏi cần tối thiểu 2 phương án', type: 'warning' })
        return clone
      }
      const updatedOpts = clone[qIndex].options.filter((_, i) => i !== optIndex)
      const updatedCorrect = clone[qIndex].correct_answer
        .filter((ans) => ans !== optIndex)
        .map((ans) => (ans > optIndex ? ans - 1 : ans))

      clone[qIndex] = {
        ...clone[qIndex],
        options: updatedOpts,
        correct_answer: updatedCorrect.length > 0 ? updatedCorrect : [0],
      }
      return clone
    })
  }

  function handleToggleCorrect(qIndex: number, optIndex: number) {
    setQuestions((prev) => {
      const clone = [...prev]
      clone[qIndex] = { ...clone[qIndex], correct_answer: [optIndex] }
      return clone
    })
  }

  function handleApplyTargetCount() {
    if (typeof targetCount !== 'number' || targetCount <= 0) return
    if (targetCount <= questions.length) {
      toast({ title: 'Thông báo', description: `Đề thi hiện đã có ${questions.length} câu hỏi.`, type: 'default' })
      return
    }
    const needed = targetCount - questions.length
    const emptySlots: QuestionItem[] = Array.from({ length: needed }, () => ({
      text: '',
      options: ['', '', '', ''],
      correct_answer: [0],
      explanation: '',
    }))
    setQuestions((prev) => [...prev, ...emptySlots])
    toast({ title: 'Thành công', description: `Đã thêm ${needed} khung câu hỏi để đạt mục tiêu ${targetCount} câu.`, type: 'success' })
  }

  // Form Submission
  async function handleSubmit(targetStatus: 'published' | 'draft', forced = false) {
    setSubmitAction(targetStatus)

    if (targetStatus === 'published' && !diagnostics.isValid) {
      toast({
        title: 'Chưa thể xuất bản',
        description: diagnostics.errors[0]?.message || 'Vui lòng hoàn thiện các câu hỏi trước khi xuất bản',
        type: 'error',
      })
      return
    }

    if (!categoryId) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn Môn học trước', type: 'error' })
      return
    }

    if (!courseCode.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập Mã đề thi (Quiz Code)', type: 'error' })
      return
    }

    if (codeDuplicateInfo?.exists) {
      toast({
        title: 'Mã đề đã tồn tại',
        description: `Mã ${courseCode.toUpperCase()} đã được sử dụng bởi đề thi khác. Vui lòng đổi mã đề.`,
        type: 'error',
      })
      return
    }

    if (!forced && bankStatus.hasConflicts && targetStatus === 'published') {
      setShowConflictModal(true)
      return
    }

    setIsSubmitting(true)
    try {
      const endpoint = quizId ? `/api/quizzes/${quizId}` : '/api/quizzes'
      const method = quizId ? 'PUT' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: courseCode.trim().toUpperCase(),
          course_code: courseCode.trim().toUpperCase(),
          category_id: categoryId,
          description: description.trim(),
          questions,
          status: targetStatus,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Lưu đề thi thất bại')
      }

      toast({
        title: 'Thành công',
        description: targetStatus === 'published' ? 'Đã xuất bản đề thi thành công' : 'Đã lưu bản nháp',
        type: 'success',
      })
      router.push('/quizzes')
      router.refresh()
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    courseCode,
    setCourseCode,
    categoryId,
    setCategoryId,
    description,
    setDescription,
    targetCount,
    setTargetCount,
    questions,
    setQuestions,
    isCheckingCode,
    codeDuplicateInfo,
    isCheckingBank,
    bankStatus,
    showConflictModal,
    setShowConflictModal,
    isSubmitting,
    submitAction,
    isCategorySelected,
    diagnostics,
    scrollToQuestion,
    handleAddQuestion,
    handleMoveQuestion,
    handleRemoveQuestion,
    handleUpdateQuestionText,
    handleUpdateOption,
    handleAddOption,
    handleRemoveOption,
    handleToggleCorrect,
    handleApplyTargetCount,
    handleSubmit,
  }
}
