'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Alert, AlertDescription } from '@/components/shared/ui/alert'
import { Loader2 } from 'lucide-react'
import { getCsrfTokenFromCookie } from '@/lib/core/security/csrf'
import { useToast } from '@/store/shared/toast-store'
import { useTranslations } from '@fquiz/ui/i18n'

interface QuestionBankWarningProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryId: string
  oldQuestionId: string
  newQuestion: {
    text: string
    options: string[]
    correct_answer: number[]
    explanation?: string
    image_url?: string
  }
  usageInfo: {
    usage_count?: number
    used_in_quizzes?: string[]
    bank_answer?: number[]
  } | null
  onUpdateAll: () => void
  onUpdateThisOnly: () => void
}

export function QuestionBankWarning({
  open,
  onOpenChange,
  categoryId,
  oldQuestionId,
  newQuestion,
  usageInfo,
  onUpdateAll,
  onUpdateThisOnly,
}: QuestionBankWarningProps) {
  const { toast } = useToast()
  const t = useTranslations()
  const [updating, setUpdating] = useState(false)

  const handleUpdateAll = async () => {
    setUpdating(true)
    try {
      const csrfToken = getCsrfTokenFromCookie()

      const response = await fetch('/api/question-bank/sync-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          category_id: categoryId,
          old_question_id: oldQuestionId,
          new_question: newQuestion,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to sync update')
      }

      await response.json()

      onUpdateAll()
      onOpenChange(false)
    } catch (error) {
      console.error('Error syncing update:', error)
      toast.error(t('questionBank.updateFailed'))
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateThisOnly = () => {
    onUpdateThisOnly()
    onOpenChange(false)
  }

  // Check if answer changed
  const answerChanged =
    usageInfo?.bank_answer &&
    JSON.stringify(newQuestion.correct_answer.sort()) !==
    JSON.stringify([...usageInfo.bank_answer].sort())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('questionBank.usedMultipleQuizzes')}</DialogTitle>
          <DialogDescription>
            {t('questionBank.inUseNotice', { count: usageInfo?.usage_count || 0 })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Usage Info */}
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  {t('questionBank.usedInCount', { count: usageInfo?.usage_count || 0 })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {usageInfo?.used_in_quizzes?.slice(0, 10).map((code) => (
                    <Badge key={code} variant="secondary">
                      {code}
                    </Badge>
                  ))}
                  {usageInfo?.used_in_quizzes && usageInfo.used_in_quizzes.length > 10 && (
                    <Badge variant="secondary">
                      {t('questionBank.otherQuizzes', { count: usageInfo.used_in_quizzes.length - 10 })}
                    </Badge>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Answer Change Warning */}
          {answerChanged && (
            <Alert variant="destructive">
              <AlertDescription>
                <p className="font-bold">{t('questionBank.answerChanged')}</p>
                <p className="text-sm mt-1">
                  {t('questionBank.updateAllWarning', { count: usageInfo?.usage_count || 0 })}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Question Preview */}
          <div className="border border-border rounded-lg p-4 bg-muted">
            <p className="font-medium mb-2">{t('questionBank.questionContent')}</p>
            <p className="text-sm text-card-foreground">{newQuestion.text}</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleUpdateThisOnly}
            disabled={updating}
            className="w-full sm:w-auto"
          >
            {t('questionBank.updateThisOnly')}
          </Button>
          <Button
            onClick={handleUpdateAll}
            disabled={updating}
            className="w-full sm:w-auto"
          >
            {updating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('questionBank.updating')}
              </>
            ) : (
              t('questionBank.updateAllCount', { count: usageInfo?.usage_count || 0 })
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
