import { useState } from 'react'
import { toast } from '@/hooks/useToast'
import { useTranslations } from '@fquiz/ui/i18n'
import { withCsrfHeaders } from '@/lib/security/csrf'
import type { QuestionItem, BankCheckResult, ParsedFilePreview } from './types'

interface UseQuizBankSyncProps {
  categoryId: string
  description: string
  setDescription: (desc: string) => void
  courseCode: string
  setCourseCode: (code: string) => void
  setQuestions: React.Dispatch<React.SetStateAction<QuestionItem[]>>
}

export function useQuizBankSync({
  categoryId,
  description,
  setDescription,
  courseCode,
  setCourseCode,
  setQuestions,
}: UseQuizBankSyncProps) {
  const t = useTranslations()
  const [showSyncConfirmModal, setShowSyncConfirmModal] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  async function checkQuestionBank(questions: QuestionItem[]): Promise<BankCheckResult | null> {
    try {
      const res = await fetch('/api/question-bank/check', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          category_id: categoryId,
          questions,
        }),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (checkErr) {
      console.warn('Bank check warning:', checkErr)
    }
    return null
  }

  async function executeApplyFilePreview(
    filePreview: ParsedFilePreview | null,
    onSuccess?: () => void
  ) {
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
          }
          return {
            ...q,
            question_id: detail.bank.question_id,
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

      // Auto-sync conflict questions where user chose 'file' to QuestionBank
      const syncTasks: Promise<any>[] = []
      filePreview.rawQuestions.forEach((q, idx) => {
        const detail = filePreview.checkResult?.details.find((d) => d.questionIndex === idx)
        if (detail?.status === 'conflict' && detail.bank) {
          const choice = filePreview.conflictResolutions[idx] || 'file'
          if (choice === 'file') {
            syncTasks.push(
              fetch('/api/question-bank/sync-update', {
                method: 'POST',
                headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
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
                  throw new Error(data.error || `Failed to synchronize question ${idx + 1}`)
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
            title: t('admin.questionBankSyncWarning'),
            description: t('admin.syncPartial', { success: successCount, total: syncTasks.length, failed: failedCount }),
            type: 'warning',
          })
        } else {
          toast({
            title: t('admin.questionBankAndQuizzesUpdated'),
            description: t('admin.syncComplete', { count: successCount }),
            type: 'success',
          })
        }
      }

      setQuestions(processedQuestions)
      setShowSyncConfirmModal(false)
      onSuccess?.()
      toast({
        title: t('admin.questionsImported'),
        description: t('admin.importedAndChecked', { count: processedQuestions.length }),
        type: 'success',
      })
    } catch {
      toast({ title: t('admin.applyQuestionsFailed'), description: t('admin.applyQuestionsFailed'), type: 'error' })
    } finally {
      setIsSyncing(false)
    }
  }

  return {
    showSyncConfirmModal,
    setShowSyncConfirmModal,
    isSyncing,
    checkQuestionBank,
    executeApplyFilePreview,
  }
}
