'use client'

/**
 * Wrapper component để tích hợp Question Bank vào QuizEditor
 * Sử dụng component này thay vì QuizEditor trực tiếp
 */

import { useState, useEffect, useRef, useCallback } from 'react'
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

  // Flag to skip duplicate conflict modal when admin has already confirmed choices
  const skipNextConflictCheckRef = useRef(false)

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

    if (skipNextConflictCheckRef.current) {
      skipNextConflictCheckRef.current = false
      return true
    }

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
      skipNextConflictCheckRef.current = true
      applyResolutionsRef.current?.(resolutions ?? [])
    }
  }

  const handleFormChange = useCallback((data: any) => {
    setFormData((prev: any) => {
      if (
        prev?.category_id === data.category_id &&
        prev?.questions?.length === data.questions?.length &&
        JSON.stringify(prev) === JSON.stringify(data)
      ) {
        return prev
      }
      skipNextConflictCheckRef.current = false
      return data
    })
  }, [])

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
        onFormChange={handleFormChange}
        onConflictsResolved={() => {
          skipNextConflictCheckRef.current = true
        }}
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

function getStatusConfig(checking: boolean, hasDiff: boolean, hasSame: boolean, hasAny: boolean, result: any) {
  if (checking) {
    return {
      style: 'border-info-border bg-info-bg text-info-fg',
      icon: <Loader2 className="h-5 w-5 animate-spin text-info-fg mt-0.5" />,
      text: 'Đang kiểm tra...',
    }
  }
  if (hasDiff) {
    return {
      style: 'border-incorrect-border bg-incorrect-bg text-destructive',
      icon: <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />,
      text: <span className="text-destructive font-medium">{result?.different_answer_conflicts} câu có mâu thuẫn đáp án!</span>,
    }
  }
  if (hasSame) {
    return {
      style: 'border-warning-border bg-warning-bg text-warning-fg',
      icon: <CheckCircle2 className="h-5 w-5 text-warning-fg mt-0.5" />,
      text: <span className="text-warning-fg font-medium">✓ {result?.same_answer_conflicts} câu đã tồn tại (có thể tái sử dụng)</span>,
    }
  }
  if (hasAny) {
    return {
      style: 'border-success-border bg-success-bg text-success-fg',
      icon: <CheckCircle2 className="h-5 w-5 text-success-fg mt-0.5" />,
      text: <span className="text-success-fg font-medium">✓ Tất cả câu hỏi hợp lệ</span>,
    }
  }
  return {
    style: 'border-border bg-card text-card-foreground',
    icon: <Database className="h-5 w-5 text-muted-foreground mt-0.5" />,
    text: 'Chưa có câu hỏi nào',
  }
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
  const config = getStatusConfig(checking, hasDifferentAnswerConflicts, hasSameAnswerConflicts, hasAnyConflicts, result)

  return (
    <div className="mb-4 w-full">
      <Alert className={`shadow-xs ${config.style}`}>
        <div className="flex items-start gap-3">
          {config.icon}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-current">Ngân hàng câu hỏi</span>
              {result && (
                <Badge variant="outline" className="text-xs border-current/30 text-current">
                  {result.total_questions} câu
                </Badge>
              )}
            </div>
            <AlertDescription className="text-xs text-current">
              {config.text}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  )
}
