import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/useToast'
import { useTranslations } from '@fquiz/ui/i18n'
import { withCsrfHeaders } from '@/lib/security/csrf'
import { useQuizDiagnostics } from './useQuizDiagnostics'
import { useCourseCodeCheck } from './useCourseCodeCheck'
import { useQuizQuestions } from './useQuizQuestions'
import type { QuizDiagnostics } from './types'

interface UseQuizEditorFormProps {
  initialData?: any
  quizId?: string
}

export function useQuizEditorForm({ initialData, quizId }: UseQuizEditorFormProps) {
  const t = useTranslations()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '')
  const [description, setDescription] = useState(initialData?.description || '')

  const { courseCode, setCourseCode, isCheckingCode, codeDuplicateInfo } = useCourseCodeCheck({
    initialCode: initialData?.course_code || '',
    quizId,
  })

  const {
    questions,
    setQuestions,
    targetCount,
    setTargetCount,
    handleAddQuestion,
    handleMoveQuestion,
    handleRemoveQuestion,
    handleUpdateQuestionText,
    handleUpdateOption,
    handleAddOption,
    handleRemoveOption,
    handleToggleCorrect,
    handleApplyTargetCount,
  } = useQuizQuestions(initialData?.questions)

  // Question Bank Background Status
  const [isCheckingBank, setIsCheckingBank] = useState(false)
  const [bankStatus, setBankStatus] = useState({ checked: false, hasConflicts: false, conflicts: [] as any[] })
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitAction, setSubmitAction] = useState<'published' | 'draft'>('published')

  const isCategorySelected = Boolean(categoryId)

  const diagnostics: QuizDiagnostics = useQuizDiagnostics({
    questions,
    courseCode,
    categoryId,
    codeDuplicateInfo,
  })

  // Question Bank Debounced Check
  useEffect(() => {
    if (!categoryId) {
      setBankStatus({ checked: false, hasConflicts: false, conflicts: [] })
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingBank(true)
        const res = await fetch(`/api/question-bank/conflicts?category_id=${categoryId}`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const conflicts = data.conflicts || []
          setBankStatus({ checked: true, hasConflicts: conflicts.length > 0, conflicts })
        }
      } catch {
        // Non-blocking background check
      } finally {
        setIsCheckingBank(false)
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [categoryId])

  function scrollToQuestion(index: number) {
    const el = document.getElementById(`question-card-${index}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-primary')
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 2000)
    }
  }

  // Form Submission
  async function handleSubmit(targetStatus: 'published' | 'draft', forced = false) {
    setSubmitAction(targetStatus)

    if (targetStatus === 'published' && !diagnostics.isValid) {
      toast({ title: t('admin.publishBlocked'), description: t('admin.questionErrorsRemain'), type: 'error' })
      return
    }
    if (!categoryId) {
      toast({ title: t('toast.error'), description: t('admin.selectCategoryFirst'), type: 'error' })
      return
    }
    if (!courseCode.trim()) {
      toast({ title: t('toast.error'), description: t('admin.enterQuizCode'), type: 'error' })
      return
    }
    if (codeDuplicateInfo?.exists) {
      toast({ title: t('admin.quizCodeExists'), description: t('admin.duplicateQuizCode', { code: courseCode.toUpperCase() }), type: 'error' })
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
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
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
      if (!res.ok) throw new Error(data.error || 'Failed to save quiz')

      toast({
        title: t('toast.success'),
        description: targetStatus === 'published' ? t('admin.quizPublished') : t('admin.draftSaved'),
        type: 'success',
      })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'quizzes'] })
      router.push('/quizzes')
    } catch {
      toast({ title: t('toast.error'), description: t('admin.quizSaveFailed'), type: 'error' })
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
