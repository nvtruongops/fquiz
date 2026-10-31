'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { analyzeQuizCompleteness } from '@/lib/modules/quiz/quiz-analyzer'
import { useQuestionBankCheck } from '@/hooks/quiz/useQuestionBankCheck'
import type { Category, QuizFormData, QuestionForm } from '@/lib/modules/quiz/types/quiz'
import type { ImportedQuiz } from '@/hooks/quiz/useQuizImport'
import { useQuizQuestions, emptyQuestion } from '@/hooks/quiz/useQuizQuestions'
import { useQuizAutoSave } from '@/hooks/quiz/useQuizAutoSave'
import { useQuizSave } from '@/hooks/quiz/useQuizSave'

export interface QuizEditorOptions {
  initialData?: Partial<QuizFormData>
  quizId?: string
  categories: Category[]
  createEndpoint: string
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
  onConflictsResolved?: () => void
}

export function useQuizEditor(options: QuizEditorOptions) {
  const {
    initialData,
    quizId,
    categories,
    createEndpoint,
    updateEndpointBuilder,
    redirectOnPublish,
    allowDraft,
    enableAutosave,
    onBeforeSubmit,
    registerApplyResolutions,
    onServerConflict,
    onConflictsResolved,
  } = options

  const canSaveDraft = allowDraft ?? true
  const autosaveEnabled = enableAutosave ?? true

  const [form, setForm] = useState<QuizFormData>(() => ({
    description: (initialData as any)?.description ?? '',
    category_id: initialData?.category_id ?? '',
    course_code: (initialData as any)?.course_code ?? '',
    questions: initialData?.questions?.length
      ? (initialData.questions as QuestionForm[])
      : [emptyQuestion()],
    status: initialData?.status ?? 'published',
  }))

  const forceSaveAfterResolveRef = useRef(false)

  const questionsApi = useQuizQuestions({
    form,
    setForm,
    categories,
    onConflictsResolved,
  })

  const importEnabled = process.env.NEXT_PUBLIC_ENABLE_QUIZ_IMPORT !== 'false'

  const bankCheck = useQuestionBankCheck({
    categoryId: form.category_id,
    questions: form.questions.map((q) => ({
      text: q.text,
      options: q.options,
      correct_answer: q.correct_answers,
      explanation: q.explanation,
      image_url: q.image_url,
    })),
    enabled: !!form.category_id,
    autoCheck: false,
    debounceMs: 2000,
  })

  const bankCheckResults = useMemo(() => {
    const map: Record<number, boolean> = {}
    if (bankCheck.result?.conflicts) {
      bankCheck.result.conflicts.same_answer.forEach((c) => {
        map[c.questionIndex] = true
      })
      bankCheck.result.conflicts.different_answer.forEach((c) => {
        map[c.questionIndex] = true
      })
    }
    return map
  }, [bankCheck.result])

  const diagnostics = useMemo(
    () => analyzeQuizCompleteness({ ...form, course_code: form.course_code } as any, questionsApi.targetCount),
    [form, questionsApi.targetCount]
  )

  const scrollToQuestion = (idx: number) => {
    const el = document.getElementById(`q-card-${idx}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-red-500', 'ring-offset-2')
      setTimeout(() => el.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2'), 2000)
    }
  }

  const saveApi = useQuizSave({
    quizId,
    initialUpdatedAt: (initialData as any)?.updatedAt ?? null,
    canSaveDraft,
    createEndpoint,
    updateEndpointBuilder,
    redirectOnPublish,
    onBeforeSubmit,
    onServerConflict,
    form,
    setForm,
    diagnostics,
    hasImportBlockingErrors: questionsApi.hasImportBlockingErrors,
    isImportProcessing: questionsApi.isImportProcessing,
    waitForAutosave: () => autoSaveApi.waitForAutosave(),
    setLastSavedAt: (date) => autoSaveApi.setLastSavedAt(date),
    scrollToQuestion,
  })

  const autoSaveApi = useQuizAutoSave({
    form,
    activeQuizId: saveApi.activeQuizId,
    autosaveEnabled,
    isImportProcessing: questionsApi.isImportProcessing,
    doSave: saveApi.doSave,
  })

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
        saveApi.doSave('published')
      }
    })
  }, [registerApplyResolutions, saveApi])

  useEffect(() => {
    if (!forceSaveAfterResolveRef.current) return
    forceSaveAfterResolveRef.current = false
    saveApi.doSave('published')
  }, [form, saveApi])

  return {
    activeQuizId: saveApi.activeQuizId,
    form,
    setForm,
    targetInput: questionsApi.targetInput,
    setTargetInput: questionsApi.setTargetInput,
    applyTargetCount: questionsApi.applyTargetCount,
    addQuestion: questionsApi.addQuestion,
    removeQuestion: questionsApi.removeQuestion,
    updateOption: questionsApi.updateOption,
    addOption: questionsApi.addOption,
    removeOption: questionsApi.removeOption,
    toggleCorrect: questionsApi.toggleCorrect,
    updateQuestion: questionsApi.updateQuestion,
    removeQuestionImage: questionsApi.removeQuestionImage,
    diagnostics,
    bankCheckResults,
    saving: saveApi.saving,
    autosaving: autoSaveApi.autosaving,
    lastSavedAt: autoSaveApi.lastSavedAt,
    error: saveApi.error,
    isSubmitBlocked: saveApi.isSubmitBlocked,
    canSaveDraft,
    importEnabled,
    showImportPanel: questionsApi.showImportPanel,
    setShowImportPanel: questionsApi.setShowImportPanel,
    handleApplyImportedQuiz: questionsApi.handleApplyImportedQuiz,
    appliedStructureReport: questionsApi.appliedStructureReport,
    setAppliedStructureReport: questionsApi.setAppliedStructureReport,
    appliedImportSummary: questionsApi.appliedImportSummary,
    setAppliedImportSummary: questionsApi.setAppliedImportSummary,
    reanalyzeFormQuestions: questionsApi.reanalyzeFormQuestions,
    setHasImportBlockingErrors: questionsApi.setHasImportBlockingErrors,
    setImportPreviewErrors: questionsApi.setImportPreviewErrors,
    setIsImportProcessing: questionsApi.setIsImportProcessing,
    scrollToQuestion,
    handleSubmit: saveApi.handleSubmit,
    handleSaveDraft: saveApi.handleSaveDraft,
    showBankWarning: questionsApi.showBankWarning,
    setShowBankWarning: questionsApi.setShowBankWarning,
    usageInfo: questionsApi.usageInfo,
    clearUsageInfo: questionsApi.clearUsageInfo,
    pendingQuestionData: questionsApi.pendingQuestionData,
    applyPendingQuestionUpdate: questionsApi.applyPendingQuestionUpdate,
  }
}
