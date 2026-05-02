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
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

interface ConflictQuestion {
  questionIndex: number
  question: {
    text: string
    options: string[]
    correct_answer: number[]
    explanation?: string
  }
  existingQuestion?: {
    _id: string
    text: string
    options: string[]
    correct_answer: number[]
    explanation?: string
    used_in_quizzes: string[]
    usage_count: number
  }
  conflictType: 'same_answer' | 'different_answer'
  message: string
}

interface QuestionConflictModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conflicts: {
    same_answer: ConflictQuestion[]
    different_answer: ConflictQuestion[]
  }
  totalConflicts: number
  onResolve: (action: 'edit' | 'skip' | 'force') => void
}

export function QuestionConflictModal({
  open,
  onOpenChange,
  conflicts,
  totalConflicts,
  onResolve,
}: QuestionConflictModalProps) {
  const [selectedTab, setSelectedTab] = useState<'different' | 'same'>(
    conflicts.different_answer.length > 0 ? 'different' : 'same'
  )

  const hasDifferentAnswers = conflicts.different_answer.length > 0
  const hasSameAnswers = conflicts.same_answer.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasDifferentAnswers ? (
              <>
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Phát hiện mâu thuẫn đáp án
              </>
            ) : (
              <>
                <Info className="h-5 w-5 text-blue-500" />
                Câu hỏi đã tồn tại
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {hasDifferentAnswers ? (
              <span className="text-red-600 font-medium">
                {conflicts.different_answer.length} câu hỏi có đáp án khác với ngân hàng môn học
              </span>
            ) : (
              <span className="text-blue-600">
                {conflicts.same_answer.length} câu hỏi đã tồn tại và có thể tái sử dụng
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {hasDifferentAnswers && (
            <button
              onClick={() => setSelectedTab('different')}
              className={`px-4 py-2 font-medium transition-colors ${
                selectedTab === 'different'
                  ? 'border-b-2 border-red-500 text-red-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Mâu thuẫn ({conflicts.different_answer.length})
              </span>
            </button>
          )}
          {hasSameAnswers && (
            <button
              onClick={() => setSelectedTab('same')}
              className={`px-4 py-2 font-medium transition-colors ${
                selectedTab === 'same'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Đã tồn tại ({conflicts.same_answer.length})
              </span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="space-y-4 py-4">
          {selectedTab === 'different' && (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Các câu hỏi dưới đây có nội dung tương tự nhưng đáp án khác với câu hỏi đã có trong ngân hàng môn học.
                  Điều này có thể gây nhầm lẫn cho học sinh. Vui lòng kiểm tra và sửa đáp án.
                </AlertDescription>
              </Alert>

              {conflicts.different_answer.map((conflict, idx) => (
                <ConflictCard key={idx} conflict={conflict} type="different" />
              ))}
            </>
          )}

          {selectedTab === 'same' && (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Các câu hỏi dưới đây đã tồn tại trong ngân hàng môn học với cùng đáp án.
                  Bạn có thể tiếp tục tạo quiz, câu hỏi sẽ được tái sử dụng.
                </AlertDescription>
              </Alert>

              {conflicts.same_answer.map((conflict, idx) => (
                <ConflictCard key={idx} conflict={conflict} type="same" />
              ))}
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {hasDifferentAnswers ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button variant="default" onClick={() => onResolve('edit')}>
                Sửa đáp án
              </Button>
              <Button
                variant="destructive"
                onClick={() => onResolve('force')}
                className="gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Bỏ qua và tiếp tục
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button variant="default" onClick={() => onResolve('skip')}>
                Tiếp tục tạo quiz
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConflictCard({
  conflict,
  type,
}: {
  conflict: ConflictQuestion
  type: 'different' | 'same'
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={type === 'different' ? 'destructive' : 'default'}>
              Câu {conflict.questionIndex + 1}
            </Badge>
            {conflict.existingQuestion && (
              <span className="text-sm text-gray-500">
                Đã dùng {conflict.existingQuestion.usage_count} lần
              </span>
            )}
          </div>
          <p className="font-medium text-gray-900">{conflict.question.text}</p>
        </div>
      </div>

      {/* Your Answer */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Đáp án bạn nhập:</p>
        <div className="grid gap-2">
          {conflict.question.options.map((option, idx) => {
            const isSelected = conflict.question.correct_answer.includes(idx)
            return (
              <div
                key={idx}
                className={`flex items-center gap-2 p-2 rounded border ${
                  isSelected
                    ? type === 'different'
                      ? 'bg-red-50 border-red-300'
                      : 'bg-green-50 border-green-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected
                      ? type === 'different'
                        ? 'border-red-500 bg-red-500'
                        : 'border-green-500 bg-green-500'
                      : 'border-gray-300'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <span className="text-sm">{option}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Existing Answer (if different) */}
      {conflict.existingQuestion && type === 'different' && (
        <div className="space-y-2 pt-3 border-t">
          <p className="text-sm font-medium text-gray-700">
            Đáp án trong ngân hàng:
          </p>
          <div className="grid gap-2">
            {conflict.existingQuestion.options.map((option, idx) => {
              const isSelected = conflict.existingQuestion!.correct_answer.includes(idx)
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded border ${
                    isSelected
                      ? 'bg-green-50 border-green-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="text-sm">{option}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Usage Info */}
      {conflict.existingQuestion && conflict.existingQuestion.used_in_quizzes.length > 0 && (
        <div className="pt-3 border-t">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Đã được sử dụng trong:
          </p>
          <div className="flex flex-wrap gap-2">
            {conflict.existingQuestion.used_in_quizzes.slice(0, 5).map((quizCode) => (
              <Badge key={quizCode} variant="outline" className="text-xs">
                {quizCode}
              </Badge>
            ))}
            {conflict.existingQuestion.used_in_quizzes.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{conflict.existingQuestion.used_in_quizzes.length - 5} khác
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
