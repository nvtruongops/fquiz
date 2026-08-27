import { useState, useMemo, useRef } from 'react'
import { toast } from '@/hooks/useToast'
import type { QuestionItem, ParsedFilePreview, BankCheckResult } from './types'

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
  const [showSyncConfirmModal, setShowSyncConfirmModal] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleOpenUploadModal() {
    if (!categoryId) {
      toast({
        title: 'Yêu cầu chọn Môn học',
        description: 'Vui lòng chọn Môn học trước để hệ thống đối chiếu với Ngân hàng câu hỏi của môn đó!',
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
      let parsedQuestions: QuestionItem[] = []
      let parsedDescription = ''
      let parsedCourseCode = ''

      // Format 1: JSON
      if (fileName.endsWith('.json') || text.trim().startsWith('[') || text.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(text)
          if (!Array.isArray(parsed) && typeof parsed === 'object') {
            if (parsed.description) parsedDescription = String(parsed.description)
            if (parsed.course_code || parsed.courseCode) parsedCourseCode = String(parsed.course_code || parsed.courseCode)
            const items = parsed.questions || parsed.items || []
            parsedQuestions = items.map((item: any, idx: number) => ({
              question_id: item.question_id,
              text: String(item.text || item.question || `Câu hỏi ${idx + 1}`),
              options: Array.isArray(item.options) ? item.options.map(String) : ['', '', '', ''],
              correct_answer: Array.isArray(item.correct_answer)
                ? item.correct_answer.map(Number)
                : [Number(item.answer ?? 0)],
              explanation: item.explanation || item.description || '',
            }))
          } else if (Array.isArray(parsed)) {
            parsedQuestions = parsed.map((item: any, idx: number) => ({
              question_id: item.question_id,
              text: String(item.text || item.question || `Câu hỏi ${idx + 1}`),
              options: Array.isArray(item.options) ? item.options.map(String) : ['', '', '', ''],
              correct_answer: Array.isArray(item.correct_answer)
                ? item.correct_answer.map(Number)
                : [Number(item.answer ?? 0)],
              explanation: item.explanation || item.description || '',
            }))
          }
        } catch {
          // fallback to text parser
        }
      }

      // Format 2: Text / TXT Parser
      if (parsedQuestions.length === 0) {
        const blocks = text.split(/\n\s*(?=(?:Câu\s*\d+|Question\s*\d+|\d+[\.\)])\s*[:\.]?)/i)

        for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
          const block = blocks[bIdx]
          const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
          if (lines.length === 0) continue

          if (bIdx === 0 && !/^(?:Câu\s*\d+|Question\s*\d+|\d+[\.\)])/i.test(lines[0])) {
            for (const l of lines) {
              const descMatch = l.match(/^(?:Mô tả|Description|Ghi chú|Note)[:\s]*(.+)/i)
              if (descMatch) parsedDescription = descMatch[1].trim()

              const codeMatch = l.match(/^(?:Mã đề|Mã môn|Quiz Code|Course Code)[:\s]*([A-Z0-9_-]+)/i)
              if (codeMatch) parsedCourseCode = codeMatch[1].trim().toUpperCase()
            }
          }

          let qText = ''
          const options: string[] = []
          let correctAnswers: number[] = [0]
          let explanation = ''

          for (const line of lines) {
            const descExpMatch = line.match(/^(?:Mô tả[:\s]*Giải thích|Mô tả|Giải thích|Explanation|HD|HDG|Note)[:\s]*(.+)/i)
            if (descExpMatch) {
              explanation = descExpMatch[1].trim()
              continue
            }

            const ansMatch = line.match(/^(?:Đáp án|Answer|Key|ĐA)[:\s]*([A-H0-9,\s]+)/i)
            if (ansMatch) {
              const rawAnswers = ansMatch[1]
              const letters = rawAnswers.match(/[A-H]/gi)
              if (letters && letters.length > 0) {
                correctAnswers = letters.map((char) => char.toUpperCase().charCodeAt(0) - 65)
              } else {
                const numbers = rawAnswers.match(/\d+/g)
                if (numbers && numbers.length > 0) {
                  correctAnswers = numbers.map((n) => Math.max(0, Number(n) - 1))
                }
              }
              continue
            }

            const optMatch = line.match(/^[A-H][\.\)\:\-]\s*(.+)/i)
            if (optMatch) {
              options.push(optMatch[1].trim())
              continue
            }

            if (options.length === 0) {
              const cleanLine = line
                .replace(/^(?:Câu\s*\d+|Question\s*\d+|\d+[\.\)])\s*[:\.]?\s*/i, '')
                .replace(/^(?:Câu\s*hỏi|Question)[:\s]*/i, '')
                .trim()
              if (cleanLine) {
                qText = qText ? `${qText}\n${cleanLine}` : cleanLine
              }
            }
          }

          if (qText || options.length > 0) {
            parsedQuestions.push({
              text: qText || 'Câu hỏi chưa có tiêu đề',
              options: options.length >= 2 ? options : ['', '', '', ''],
              correct_answer: correctAnswers.map((idx) => Math.max(0, Math.min(options.length - 1, idx))),
              explanation,
            })
          }
        }
      }

      if (parsedQuestions.length === 0) {
        throw new Error('Không nhận diện được câu hỏi nào từ file. Vui lòng kiểm tra định dạng.')
      }

      // Check Question Bank
      let checkData: BankCheckResult | null = null
      try {
        const res = await fetch('/api/question-bank/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            category_id: categoryId,
            questions: parsedQuestions,
          }),
        })
        if (res.ok) {
          checkData = await res.json()
        }
      } catch (checkErr) {
        console.warn('Bank check warning:', checkErr)
      }

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
        parsedDescription,
        parsedCourseCode,
        rawQuestions: parsedQuestions,
        checkResult: checkData,
        conflictResolutions: defaultResolutions,
      })

      // Default filter to conflict if any, else all
      if (checkData && checkData.conflict_questions_count > 0) {
        setReviewFilter('conflict')
      } else {
        setReviewFilter('all')
      }
    } catch (err: any) {
      toast({ title: 'Lỗi đọc file', description: err.message, type: 'error' })
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
      setShowSyncConfirmModal(true)
      return
    }
    executeApplyFilePreview()
  }

  async function executeApplyFilePreview() {
    if (!filePreview || filePreview.rawQuestions.length === 0) return

    setIsSyncing(true)
    try {
      const processedQuestions: QuestionItem[] = filePreview.rawQuestions.map((q, idx) => {
        const detail = filePreview.checkResult?.details.find((d) => d.questionIndex === idx)
        if (!detail) return q

        if (detail.status === 'reused' && detail.bank) {
          return {
            ...q,
            question_id: detail.bank.question_id,
          }
        }

        if (detail.status === 'conflict' && detail.bank) {
          const choice = filePreview.conflictResolutions[idx] || 'file'
          if (choice === 'bank') {
            return {
              ...q,
              question_id: detail.bank.question_id,
              options: detail.bank.options,
              correct_answer: detail.bank.correct_answer,
              explanation: detail.bank.explanation || q.explanation,
            }
          } else {
            return {
              ...q,
              question_id: detail.bank.question_id,
            }
          }
        }

        return q
      })

      if (filePreview.parsedDescription && !description) {
        setDescription(filePreview.parsedDescription)
      }
      if (filePreview.parsedCourseCode && !courseCode) {
        setCourseCode(filePreview.parsedCourseCode)
      }

      // Auto-sync any conflict questions where user selected 'file' directly to QuestionBank and all existing quizzes
      const syncTasks: Promise<any>[] = []
      filePreview.rawQuestions.forEach((q, idx) => {
        const detail = filePreview.checkResult?.details.find((d) => d.questionIndex === idx)
        if (detail?.status === 'conflict' && detail.bank) {
          const choice = filePreview.conflictResolutions[idx] || 'file'
          if (choice === 'file') {
            syncTasks.push(
              fetch('/api/question-bank/sync-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  category_id: categoryId,
                  old_question_id: detail.bank.question_id,
                  new_question: {
                    text: q.text,
                    options: q.options,
                    correct_answer: q.correct_answer,
                    explanation: q.explanation,
                  },
                }),
              }).then(async (res) => {
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}))
                  throw new Error(data.error || `Lỗi đồng bộ câu ${idx + 1}`)
                }
                return res.json()
              })
            )
          }
        }
      })

      if (syncTasks.length > 0) {
        const syncResults = await Promise.allSettled(syncTasks)
        const failedCount = syncResults.filter((r) => r.status === 'rejected').length
        const successCount = syncResults.length - failedCount

        if (failedCount > 0) {
          toast({
            title: 'Cảnh báo đồng bộ ngân hàng',
            description: `Đã cập nhật ${successCount}/${syncTasks.length} câu mâu thuẫn. Có ${failedCount} câu gặp lỗi trong quá trình đồng bộ.`,
            type: 'warning',
          })
        } else {
          toast({
            title: 'Đã cập nhật ngân hàng & đề thi',
            description: `Đã ghi đè đáp án mới của ${successCount} câu mâu thuẫn vào Ngân hàng và tất cả đề thi liên quan`,
            type: 'success',
          })
        }
      }

      setQuestions(processedQuestions)
      setShowSyncConfirmModal(false)
      setShowUploadModal(false)
      setFilePreview(null)
      toast({
        title: 'Đã nạp câu hỏi thành công',
        description: `Đã nhập và đối chiếu ${processedQuestions.length} câu hỏi với ngân hàng môn`,
        type: 'success',
      })
    } catch (err: any) {
      toast({ title: 'Lỗi áp dụng câu hỏi', description: err.message, type: 'error' })
    } finally {
      setIsSyncing(false)
    }
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
    showSyncConfirmModal,
    setShowSyncConfirmModal,
    isSyncing,
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
