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
import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { getCsrfTokenFromCookie } from '@/lib/core/security/csrf'

interface AnswerVariant {
  correct_answer: number[]
  answer_texts: string[]
  count: number
  quizzes: string[]
  options: string[]
}

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
  answerVariants?: AnswerVariant[]
}

export interface ResolvedAnswer {
  questionIndex: number
  source: 'current' | 'bank'
  correct_answer: number[]
  options: string[]
}

interface QuestionConflictModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conflicts: {
    same_answer: ConflictQuestion[]
    different_answer: ConflictQuestion[]
  }
  totalConflicts: number
  onResolve: (action: 'edit' | 'skip' | 'force', resolutions?: ResolvedAnswer[]) => void
  categoryId?: string
}

export function QuestionConflictModal({
  open,
  onOpenChange,
  conflicts,
  totalConflicts,
  onResolve,
  categoryId,
}: QuestionConflictModalProps) {
  const [selectedTab, setSelectedTab] = useState<'different' | 'same'>(
    conflicts.different_answer.length > 0 ? 'different' : 'same'
  )
  const [selections, setSelections] = useState<Record<number, 'current' | 'bank'>>({})
  const [syncing, setSyncing] = useState(false)

  const hasDifferentAnswers = conflicts.different_answer.length > 0
  const hasSameAnswers = conflicts.same_answer.length > 0

  // For each different_answer conflict, build the list of choices
  const allChoices = conflicts.different_answer.map((conflict) => {
    const choices: Array<{
      id: string
      label: string
      correct_answer: number[]
      options: string[]
      quizzes: string[]
      count: number
    }> = [
      {
        id: `current-${conflict.questionIndex}`,
        label: 'Đáp án hiện tại (từ file của tôi)',
        correct_answer: conflict.question.correct_answer,
        options: conflict.question.options,
        quizzes: [],
        count: 1,
      },
    ]

    // Answer texts of the user's choice — compare by TEXT (not index) since
    // option order can differ between quizzes but the hash treats them as the
    // same question. This avoids both false matches and array mutation bugs.
    const userAnswerTexts = JSON.stringify(
      conflict.question.correct_answer
        .map((i) => (conflict.question.options[i] ?? '').trim().toLowerCase())
        .sort()
    )

    if (conflict.answerVariants && conflict.answerVariants.length > 0) {
      for (const variant of conflict.answerVariants) {
        const variantAnswerTexts = JSON.stringify(
          variant.correct_answer
            .map((i) => (variant.options[i] ?? '').trim().toLowerCase())
            .sort()
        )
        const sameAsUser = variantAnswerTexts === userAnswerTexts
        if (!sameAsUser) {
          const quizLabel = variant.quizzes.length > 0
            ? `ở mã ${variant.quizzes.slice(0, 2).join(', ')}${variant.quizzes.length > 2 ? `…` : ''}`
            : ''
          choices.push({
            id: `bank-${conflict.questionIndex}-${choices.length}`,
            label: `Đáp án trong ngân hàng ${quizLabel}`.trim(),
            correct_answer: variant.correct_answer,
            options: variant.options,
            quizzes: variant.quizzes,
            count: variant.count,
          })
        }
      }
    } else if (conflict.existingQuestion) {
      choices.push({
        id: `bank-${conflict.questionIndex}-1`,
        label: `Dùng đáp án trong ngân hàng (${conflict.existingQuestion.usage_count} quiz)`,
        correct_answer: conflict.existingQuestion.correct_answer,
        options: conflict.existingQuestion.options,
        quizzes: conflict.existingQuestion.used_in_quizzes,
        count: conflict.existingQuestion.usage_count,
      })
    }

    return { questionIndex: conflict.questionIndex, text: conflict.question.text, choices, conflict }
  })

  const handleSelect = (questionIndex: number, choice: 'current' | 'bank') => {
    setSelections((prev) => ({ ...prev, [questionIndex]: choice }))
  }

  const handleApply = async () => {
    const differentConflicts = conflicts.different_answer
    const allResolved = differentConflicts.every((c) => selections[c.questionIndex] !== undefined)

    if (!allResolved) return

    // Collect every resolution so the parent can apply it to the form before saving.
    const resolutions: ResolvedAnswer[] = []
    const currentChoices: ResolvedAnswer[] = []

    for (const conflict of differentConflicts) {
      const selection = selections[conflict.questionIndex]
      if (selection === 'bank') {
        const choice = allChoices
          .find((c) => c.questionIndex === conflict.questionIndex)
          ?.choices.find((c) => c.id.startsWith('bank-'))
        if (choice) {
          resolutions.push({
            questionIndex: conflict.questionIndex,
            source: 'bank',
            correct_answer: choice.correct_answer,
            options: choice.options,
          })
        }
      } else {
        const resolved: ResolvedAnswer = {
          questionIndex: conflict.questionIndex,
          source: 'current',
          correct_answer: conflict.question.correct_answer,
          options: conflict.question.options,
        }
        resolutions.push(resolved)
        currentChoices.push(resolved)
      }
    }

    if (currentChoices.length > 0 && categoryId) {
      setSyncing(true)
      try {
        for (const choice of currentChoices) {
          const conflict = differentConflicts.find((c) => c.questionIndex === choice.questionIndex)
          if (!conflict) continue

          const csrfToken = getCsrfTokenFromCookie()
          await fetch('/api/question-bank/sync-update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
            },
            credentials: 'include',
            body: JSON.stringify({
              category_id: categoryId,
              old_question_id: '', // Will be resolved by text matching in sync-update
              new_question: {
                text: conflict.question.text,
                options: choice.options,
                correct_answer: choice.correct_answer,
              },
            }),
          })
        }
      } catch (e) {
        console.error('Failed to sync bank:', e)
      } finally {
        setSyncing(false)
      }
    }

    onResolve('force', resolutions)
  }

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
                {conflicts.different_answer.length} câu hỏi có đáp án khác với ngân hàng môn học.
                Chọn đáp án bạn muốn giữ cho mỗi câu.
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
                  Chọn đáp án đúng cho mỗi câu hỏi. Nếu chọn đáp án của bạn, system sẽ tự động đồng bộ lên
                  ngân hàng và cập nhật các quiz cũ. Nếu chọn đáp án trong ngân hàng, câu hỏi trong quiz này
                  sẽ được cập nhật theo.
                </AlertDescription>
              </Alert>

              {allChoices.map(({ questionIndex, text, choices, conflict }) => {
                const selected = selections[questionIndex] || 'current'
                return (
                  <div key={questionIndex} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive">Câu {questionIndex + 1}</Badge>
                    </div>
                    <p className="font-medium text-gray-900">{text}</p>
                    <div className="space-y-2">
                      {choices.map((choice) => {
                        const isSelected = (choice.id.startsWith('current') && selected === 'current') ||
                          (choice.id.startsWith('bank-') && selected === 'bank')
                        return (
                          <button
                            key={choice.id}
                            onClick={() => handleSelect(questionIndex, choice.id.startsWith('current') ? 'current' : 'bank')}
                            className={`w-full text-left rounded-lg border-2 p-3 transition-all ${
                              isSelected
                                ? choice.id.startsWith('current')
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-green-500 bg-green-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? choice.id.startsWith('current')
                                    ? 'border-blue-500'
                                    : 'border-green-500'
                                  : 'border-gray-300'
                              }`}>
                                {isSelected && (
                                  <div className={`w-3 h-3 rounded-full ${
                                    choice.id.startsWith('current') ? 'bg-blue-500' : 'bg-green-500'
                                  }`} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{choice.label}</span>
                                  {choice.id.startsWith('bank-') && choice.quizzes.length > 0 && (
                                    <span className="text-xs text-gray-500">
                                      mã: {choice.quizzes.slice(0, 3).join(', ')}{choice.quizzes.length > 3 ? `, +${choice.quizzes.length - 3}` : ''}
                                    </span>
                                  )}
                                </div>
                                <ul className="mt-1.5 space-y-1">
                                  {choice.correct_answer.map((i) => (
                                    <li
                                      key={i}
                                      className={`text-xs text-gray-800 rounded px-2 py-1 leading-snug break-words ${
                                        choice.id.startsWith('current') ? 'bg-blue-100/60' : 'bg-green-100/60'
                                      }`}
                                    >
                                      {String.fromCharCode(65 + i)}. {choice.options[i] ?? ''}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
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
                <div key={idx} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default">Câu {conflict.questionIndex + 1}</Badge>
                    {conflict.existingQuestion && (
                      <span className="text-sm text-gray-500">
                        Đã dùng {conflict.existingQuestion.usage_count} lần
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-gray-900">{conflict.question.text}</p>
                  <div className="flex flex-wrap gap-1">
                    {conflict.existingQuestion?.used_in_quizzes.slice(0, 5).map((code) => (
                      <Badge key={code} variant="outline" className="text-[10px]">
                        {code}
                      </Badge>
                    ))}
                    {(conflict.existingQuestion?.used_in_quizzes.length ?? 0) > 5 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{conflict.existingQuestion!.used_in_quizzes.length - 5} khác
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>

          {hasDifferentAnswers && (
            <>
              <Button variant="default" onClick={() => onResolve('edit')}>
                Sửa đáp án thủ công
              </Button>
              <Button
                variant="default"
                onClick={handleApply}
                disabled={syncing || !allChoices.every((c) => selections[c.questionIndex] !== undefined)}
                className="gap-2"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang đồng bộ...
                  </>
                ) : (
                  'Xác nhận & tiếp tục'
                )}
              </Button>
            </>
          )}

          {!hasDifferentAnswers && hasSameAnswers && (
            <Button variant="default" onClick={() => onResolve('skip')}>
              Tiếp tục tạo quiz
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
