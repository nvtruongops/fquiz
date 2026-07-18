'use client'

/**
 * Wrapper component để tích hợp Question Bank vào QuizEditor
 * Sử dụng component này thay vì QuizEditor trực tiếp
 */

import { useState, useEffect, useRef } from 'react'
import { QuizEditor } from '@/components/quiz/QuizEditor'
import { QuestionConflictModal, type ResolvedAnswer } from '@/components/quiz/question-bank/QuestionConflictModal'
import { useQuestionBankCheck } from '@/hooks/quiz/useQuestionBankCheck'
import { Badge } from '@/components/shared/ui/badge'
import { Alert, AlertDescription } from '@/components/shared/ui/alert'
import { Database, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

interface Category {
  _id: string
  name: string
}

interface QuizEditorWithQuestionBankProps {
  initialData?: any
  quizId?: string
  categories: Category[]
  mode?: 'admin' | 'student'
  createEndpoint?: string
  updateEndpointBuilder?: (id: string) => string
  redirectOnPublish?: string
  cancelPath?: string
  allowDraft?: boolean
  enableAutosave?: boolean
}

export function QuizEditorWithQuestionBank(props: QuizEditorWithQuestionBankProps) {
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [conflictData, setConflictData] = useState<any>(null)
  // Bridge: QuizEditor registers a handler so the parent can apply resolved
  // answers to the form and re-submit after the admin resolves conflicts.
  const applyResolutionsRef = useRef<
    ((resolutions: ResolvedAnswer[]) => void) | null
  >(null)

  // Derive formData from props.initialData so useQuestionBankCheck runs immediately
  const [formData, setFormData] = useState<any>(() => {
    if (props.initialData) {
      return {
        category_id: props.initialData.category_id || '',
        questions: (props.initialData.questions || []).map((q: any) => ({
          text: q.text,
          options: q.options,
          correct_answer: q.correct_answers || q.correct_answer || [],
        })),
      }
    }
    return null
  })

  // Real-time check question bank
  const {
    checking,
    result,
    hasDifferentAnswerConflicts,
    hasSameAnswerConflicts,
    hasAnyConflicts,
  } = useQuestionBankCheck({
    categoryId: formData?.category_id || '',
    questions: formData?.questions || [],
    enabled: !!formData?.category_id && (formData?.questions?.length || 0) > 0,
    debounceMs: 2000, // Check sau 2s không thay đổi
  })

  // Intercept form submission để check conflicts
  const handleBeforeSubmit = (data: any) => {
    setFormData(data)

    if (hasDifferentAnswerConflicts && result && result.different_answer_conflicts > 0) {
      setConflictData({
        conflicts: result.conflicts,
        totalConflicts: result.different_answer_conflicts,
      })
      setShowConflictModal(true)
      return false
    }

    return true
  }

  const handleConflictResolve = (
    action: 'edit' | 'skip' | 'force',
    resolutions?: ResolvedAnswer[]
  ) => {
    setShowConflictModal(false)

    if (action === 'edit') {
      // Admin sẽ tự sửa đáp án trong form
      return
    }

    if (action === 'force' || action === 'skip') {
      // Apply the chosen answers to the form, then re-submit (skipping the
      // conflict gate since conflicts are now resolved).
      applyResolutionsRef.current?.(resolutions ?? [])
    }
  }

  return (
    <div className="relative">
      {formData?.category_id && (
        <QuestionBankStatusBar
          checking={checking}
          hasDifferentAnswerConflicts={hasDifferentAnswerConflicts}
          hasSameAnswerConflicts={hasSameAnswerConflicts}
          hasAnyConflicts={hasAnyConflicts}
          result={result}
        />
      )}

      {/* Original QuizEditor */}
      <QuizEditor
        {...props}
        onBeforeSubmit={handleBeforeSubmit}
        registerApplyResolutions={(fn) => {
          applyResolutionsRef.current = fn
        }}
        onServerConflict={(conflicts) => {
          // Server rejected the save due to an answer conflict — open the
          // resolution modal so the admin can pick the correct answer to sync.
          setConflictData({
            conflicts,
            totalConflicts: conflicts?.different_answer?.length ?? 0,
          })
          setShowConflictModal(true)
        }}
      />

      {/* Conflict Modal */}
      {conflictData && (
        <QuestionConflictModal
          open={showConflictModal}
          onOpenChange={setShowConflictModal}
          conflicts={conflictData.conflicts}
          totalConflicts={conflictData.totalConflicts}
          onResolve={handleConflictResolve}
          categoryId={formData?.category_id || ''}
        />
      )}
    </div>
  )
}

function QuestionBankStatusBar({
  checking,
  hasDifferentAnswerConflicts,
  hasSameAnswerConflicts,
  hasAnyConflicts,
  result,
}: {
  checking: boolean
  hasDifferentAnswerConflicts: boolean
  hasSameAnswerConflicts: boolean
  hasAnyConflicts: boolean
  result: any
}) {
  const alertStyle = checking
    ? 'border-blue-300 bg-blue-50'
    : hasDifferentAnswerConflicts
    ? 'border-red-300 bg-red-50'
    : hasSameAnswerConflicts
    ? 'border-yellow-300 bg-yellow-50'
    : hasAnyConflicts
    ? 'border-green-300 bg-green-50'
    : 'border-gray-300 bg-white'

  return (
    <div className="fixed top-20 right-8 z-50 w-80">
      <Alert className={`shadow-lg ${alertStyle}`}>
        <div className="flex items-start gap-3">
          {checking ? (
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 mt-0.5" />
          ) : hasDifferentAnswerConflicts ? (
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          ) : hasAnyConflicts ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          ) : (
            <Database className="h-5 w-5 text-gray-400 mt-0.5" />
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold">Ngân hàng câu hỏi</span>
              {result && (
                <Badge variant="outline" className="text-xs">
                  {result.total_questions} câu
                </Badge>
              )}
            </div>

            <AlertDescription className="text-xs">
              {checking ? (
                'Đang kiểm tra...'
              ) : hasDifferentAnswerConflicts ? (
                <span className="text-red-700 font-medium">
                  {result?.different_answer_conflicts} câu có mâu thuẫn đáp án!
                </span>
              ) : hasSameAnswerConflicts ? (
                <span className="text-yellow-700">
                  ✓ {result?.same_answer_conflicts} câu đã tồn tại (có thể tái sử dụng)
                </span>
              ) : hasAnyConflicts ? (
                <span className="text-green-700">
                  ✓ Tất cả câu hỏi hợp lệ
                </span>
              ) : (
                'Chưa có câu hỏi nào'
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  )
}
