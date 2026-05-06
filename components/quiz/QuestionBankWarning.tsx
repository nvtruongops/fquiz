'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { getCsrfTokenFromCookie } from '@/lib/csrf'

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
      console.log('Sync update result:', data)

      onUpdateAll()
      onOpenChange(false)
    } catch (error) {
      console.error('Error syncing update:', error)
      alert('Có lỗi khi cập nhật. Vui lòng thử lại.')
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
          <DialogTitle> Câu hỏi đang được dùng ở nhiều quiz</DialogTitle>
          <DialogDescription>
            Câu hỏi này đang được sử dụng trong {usageInfo?.usage_count || 0} quiz khác.
            Bạn muốn cập nhật như thế nào?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Usage Info */}
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  Đang được dùng trong {usageInfo?.usage_count || 0} quiz:
                </p>
                <div className="flex flex-wrap gap-2">
                  {usageInfo?.used_in_quizzes?.slice(0, 10).map((code) => (
                    <Badge key={code} variant="secondary">
                      {code}
                    </Badge>
                  ))}
                  {usageInfo?.used_in_quizzes && usageInfo.used_in_quizzes.length > 10 && (
                    <Badge variant="secondary">
                      +{usageInfo.used_in_quizzes.length - 10} quiz khác
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
                <p className="font-bold"> Đáp án đã thay đổi!</p>
                <p className="text-sm mt-1">
                  Nếu cập nhật tất cả quiz, đáp án trong {usageInfo?.usage_count || 0} quiz
                  sẽ bị thay đổi theo. Điều này có thể ảnh hưởng đến kết quả của
                  học sinh đã làm bài.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Question Preview */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="font-medium mb-2">Nội dung câu hỏi:</p>
            <p className="text-sm text-gray-700">{newQuestion.text}</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleUpdateThisOnly}
            disabled={updating}
            className="w-full sm:w-auto"
          >
            Chỉ sửa quiz này
          </Button>
          <Button
            onClick={handleUpdateAll}
            disabled={updating}
            className="w-full sm:w-auto"
          >
            {updating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang cập nhật...
              </>
            ) : (
              `Cập nhật tất cả ${usageInfo?.usage_count || 0} quiz`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
