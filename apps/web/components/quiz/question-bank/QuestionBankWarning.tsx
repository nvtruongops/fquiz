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

      const data = await response.json()

      onUpdateAll()
      onOpenChange(false)
    } catch (error) {
      console.error('Error syncing update:', error)
      toast.error('An error occurred during update. Please try again.')
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
          <DialogTitle>Question Used in Multiple Quizzes</DialogTitle>
          <DialogDescription>
            This question is currently used in {usageInfo?.usage_count || 0} other quizzes.
            How would you like to update it?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Usage Info */}
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  Used in {usageInfo?.usage_count || 0} quizzes:
                </p>
                <div className="flex flex-wrap gap-2">
                  {usageInfo?.used_in_quizzes?.slice(0, 10).map((code) => (
                    <Badge key={code} variant="secondary">
                      {code}
                    </Badge>
                  ))}
                  {usageInfo?.used_in_quizzes && usageInfo.used_in_quizzes.length > 10 && (
                    <Badge variant="secondary">
                      +{usageInfo.used_in_quizzes.length - 10} other quizzes
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
                <p className="font-bold">Answer has changed!</p>
                <p className="text-sm mt-1">
                  Updating all quizzes will change the answer across {usageInfo?.usage_count || 0} quizzes.
                  This may affect existing student results.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Question Preview */}
          <div className="border border-border rounded-lg p-4 bg-muted">
            <p className="font-medium mb-2">Question content:</p>
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
            Update this quiz only
          </Button>
          <Button
            onClick={handleUpdateAll}
            disabled={updating}
            className="w-full sm:w-auto"
          >
            {updating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              `Update all ${usageInfo?.usage_count || 0} quizzes`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
