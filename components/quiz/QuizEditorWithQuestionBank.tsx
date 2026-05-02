'use client'

/**
 * Wrapper component để tích hợp Question Bank vào QuizEditor
 * Sử dụng component này thay vì QuizEditor trực tiếp
 */

import { useState, useEffect } from 'react'
import { QuizEditor } from './QuizEditor'
import { QuestionConflictModal } from './QuestionConflictModal'
import { QuestionBankBrowser } from './QuestionBankBrowser'
import { useQuestionBankCheck } from '@/hooks/useQuestionBankCheck'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  const [showBankBrowser, setShowBankBrowser] = useState(false)
  const [conflictData, setConflictData] = useState<any>(null)
  const [formData, setFormData] = useState<any>(null)

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

    if (hasDifferentAnswerConflicts && result) {
      // Có mâu thuẫn đáp án - hiển thị modal
      setConflictData({
        conflicts: result.conflicts,
        totalConflicts: result.different_answer_conflicts,
      })
      setShowConflictModal(true)
      return false // Block submission
    }

    return true // Allow submission
  }

  const handleConflictResolve = (action: 'edit' | 'skip' | 'force') => {
    setShowConflictModal(false)

    if (action === 'edit') {
      // User sẽ tự sửa trong form
      return
    }

    if (action === 'force') {
      // Force submit (bỏ qua cảnh báo)
      // TODO: Implement force submit
      console.log('Force submit with conflicts')
    }

    if (action === 'skip') {
      // Continue với câu hỏi đã tồn tại
      // TODO: Implement skip
      console.log('Skip and continue')
    }
  }

  return (
    <div className="relative">
      {/* Question Bank Status Bar */}
      {formData?.category_id && (
        <div className="fixed top-20 right-8 z-50 w-80">
          <Alert
            className={`shadow-lg ${
              checking
                ? 'border-blue-300 bg-blue-50'
                : hasDifferentAnswerConflicts
                ? 'border-red-300 bg-red-50'
                : hasSameAnswerConflicts
                ? 'border-yellow-300 bg-yellow-50'
                : hasAnyConflicts
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 bg-white'
            }`}
          >
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

                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => setShowBankBrowser(true)}
                  >
                    <Database className="h-3 w-3 mr-1" />
                    Duyệt ngân hàng
                  </Button>
                </div>
              </div>
            </div>
          </Alert>
        </div>
      )}

      {/* Original QuizEditor */}
      <QuizEditor
        {...props}
        // TODO: Inject beforeSubmit handler
      />

      {/* Conflict Modal */}
      {conflictData && (
        <QuestionConflictModal
          open={showConflictModal}
          onOpenChange={setShowConflictModal}
          conflicts={conflictData.conflicts}
          totalConflicts={conflictData.totalConflicts}
          onResolve={handleConflictResolve}
        />
      )}

      {/* Question Bank Browser */}
      <QuestionBankBrowser
        open={showBankBrowser}
        onOpenChange={setShowBankBrowser}
        categoryId={formData?.category_id || ''}
        onSelectQuestion={(question) => {
          // TODO: Add question to form
          console.log('Selected question:', question)
        }}
      />
    </div>
  )
}
