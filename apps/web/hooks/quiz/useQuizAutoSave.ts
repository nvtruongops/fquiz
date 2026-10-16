'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useDebounce } from '@/hooks/shared/useDebounce'
import type { QuizFormData } from '@/lib/modules/quiz/types/quiz'

interface UseQuizAutoSaveOptions {
  form: QuizFormData
  activeQuizId?: string
  autosaveEnabled: boolean
  isImportProcessing: boolean
  doSave: (overrideStatus?: 'published' | 'draft', quiet?: boolean) => Promise<void>
}

export function useQuizAutoSave({
  form,
  activeQuizId,
  autosaveEnabled,
  isImportProcessing,
  doSave,
}: UseQuizAutoSaveOptions) {
  const [autosaving, setAutosaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const debouncedForm = useDebounce(form, 3000)
  const isFirstLoad = useRef(true)
  const autosaveInFlightRef = useRef(false)
  const autosaveResolveRef = useRef<(() => void) | null>(null)
  const lastSavedSignatureRef = useRef<string | null>(null)

  const handleAutosave = useCallback(async () => {
    if (autosaveInFlightRef.current) return
    autosaveInFlightRef.current = true
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
      setLastSavedAt(new Date())
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

  const waitForAutosave = useCallback(async () => {
    if (autosaveInFlightRef.current) {
      const timeoutPromise = new Promise<void>(res => setTimeout(res, 3000))
      const waitAutosavePromise = new Promise<void>(res => { autosaveResolveRef.current = res })
      await Promise.race([waitAutosavePromise, timeoutPromise])
    }
  }, [])

  return {
    autosaving,
    lastSavedAt,
    setLastSavedAt,
    waitForAutosave,
  }
}
