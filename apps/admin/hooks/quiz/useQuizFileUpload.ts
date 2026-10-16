import { useState, useMemo, useRef } from 'react'
import { toast } from '@/hooks/useToast'
import { parseQuizFileContent } from '@/lib/utils/quiz-file-parser'
import { useQuizBankSync } from './useQuizBankSync'
import type { QuestionItem, ParsedFilePreview } from './types'

interface UseQuizFileUploadProps {
  categoryId: string
  description: string
  setDescription: (desc: string) => void
  courseCode: string
  setCourseCode: (code: string) => void
  setQuestions: React.Dispatch<React.SetStateAction<QuestionItem[]>>
}

export function useQuizFileUpload({
  categoryId,
  description,
  setDescription,
  courseCode,
  setCourseCode,
  setQuestions,
}: UseQuizFileUploadProps) {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [filePreview, setFilePreview] = useState<ParsedFilePreview | null>(null)
  const [reviewFilter, setReviewFilter] = useState<'all' | 'conflict' | 'new' | 'reused'>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const bankSync = useQuizBankSync({
    categoryId,
    description,
    setDescription,
    courseCode,
    setCourseCode,
    setQuestions,
  })

  function handleOpenUploadModal() {
    if (!categoryId) {
      toast({
        title: 'Subject/Category required',
        description: 'Please select a subject first so the system can verify against the question bank!',
        type: 'warning',
      })
      const catSelect = document.getElementById('category-select-trigger')
      if (catSelect) catSelect.focus()
      return
    }
    setShowUploadModal(true)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    parseAndReviewFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    parseAndReviewFile(file)
  }

  async function parseAndReviewFile(file: File) {
    setIsParsingFile(true)
    const fileName = file.name
    const fileSize = `${(file.size / 1024).toFixed(1)} KB`

    try {
      const text = await file.text()
      const { questions, description: parsedDesc, courseCode: parsedCode } = parseQuizFileContent(fileName, text)

      const checkData = await bankSync.checkQuestionBank(questions)
      const defaultResolutions: Record<number, 'file' | 'bank'> = {}

      if (checkData?.details) {
        checkData.details.forEach((d) => {
          if (d.status === 'conflict') {
            defaultResolutions[d.questionIndex] = 'file'
          }
        })
      }

      setFilePreview({
        fileName,
        fileSize,
        parsedDescription: parsedDesc,
        parsedCourseCode: parsedCode,
        rawQuestions: questions,
        checkResult: checkData,
        conflictResolutions: defaultResolutions,
      })

      if (checkData && checkData.conflict_questions_count > 0) {
        setReviewFilter('conflict')
      } else {
        setReviewFilter('all')
      }
    } catch (err: any) {
      toast({ title: 'File read error', description: err.message, type: 'error' })
    } finally {
      setIsParsingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleToggleConflictChoice(questionIndex: number, choice: 'file' | 'bank') {
    setFilePreview((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        conflictResolutions: {
          ...prev.conflictResolutions,
          [questionIndex]: choice,
        },
      }
    })
  }

  const fileConflictItems = useMemo(() => {
    if (!filePreview?.checkResult?.details) return []
    return filePreview.checkResult.details.filter(
      (d) =>
        d.status === 'conflict' &&
        d.bank &&
        (filePreview.conflictResolutions[d.questionIndex] || 'file') === 'file'
    )
  }, [filePreview])

  function handleClickApplyFilePreview() {
    if (!filePreview || filePreview.rawQuestions.length === 0) return
    if (fileConflictItems.length > 0) {
      bankSync.setShowSyncConfirmModal(true)
      return
    }
    executeApplyFilePreview()
  }

  async function executeApplyFilePreview() {
    await bankSync.executeApplyFilePreview(filePreview, () => {
      setShowUploadModal(false)
      setFilePreview(null)
    })
  }

  function scrollToReviewQuestion(index: number) {
    const el = document.getElementById(`review-question-${index}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-primary', 'shadow-md')
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'shadow-md'), 2000)
    }
  }

  return {
    showUploadModal,
    setShowUploadModal,
    isParsingFile,
    filePreview,
    setFilePreview,
    reviewFilter,
    setReviewFilter,
    showSyncConfirmModal: bankSync.showSyncConfirmModal,
    setShowSyncConfirmModal: bankSync.setShowSyncConfirmModal,
    isSyncing: bankSync.isSyncing,
    fileInputRef,
    fileConflictItems,
    handleOpenUploadModal,
    handleFileSelect,
    handleDrop,
    handleToggleConflictChoice,
    handleClickApplyFilePreview,
    executeApplyFilePreview,
    scrollToReviewQuestion,
  }
}
