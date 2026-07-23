'use client'

import * as React from 'react'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent } from '@/components/shared/ui/card'
import { AlertCircle } from 'lucide-react'
import { QuizImportPanel } from '@/components/quiz/question-bank/QuizImportPanel'
import { QuestionBankWarning } from '@/components/quiz/question-bank/QuestionBankWarning'
import { Category, QuizFormData } from '@/lib/modules/quiz/types/quiz'

import { EditorMetadataForm } from '@/components/quiz/editor/EditorMetadataForm'
import { QuestionEditorCard } from '@/components/quiz/editor/QuestionEditorCard'
import { EditorProgressHub } from '@/components/quiz/editor/EditorProgressHub'
import { EditorControlPanel } from '@/components/quiz/editor/EditorControlPanel'
import { useQuizEditor } from '@/hooks/useQuizEditor'

interface Props {
  initialData?: Partial<QuizFormData>
  quizId?: string
  categories: Category[]
  mode?: 'admin' | 'student'
  createEndpoint?: string
  updateEndpointBuilder?: (id: string) => string
  redirectOnPublish?: string
  cancelPath?: string
  allowDraft?: boolean
  enableAutosave?: boolean
  onBeforeSubmit?: (data: any) => boolean | undefined
  registerApplyResolutions?: (
    fn: (resolutions: Array<{ questionIndex: number; correct_answer: number[]; options: string[] }>) => void
  ) => void
  onServerConflict?: (conflicts: any) => void
}

export function QuizEditor(props: Props) {
  const {
    initialData,
    quizId,
    categories,
    mode = 'admin',
    createEndpoint,
    updateEndpointBuilder,
    redirectOnPublish,
    cancelPath,
    allowDraft,
    enableAutosave,
    onBeforeSubmit,
    registerApplyResolutions,
    onServerConflict,
  } = props

  const {
    form, setForm,
    targetInput, setTargetInput,
    applyTargetCount,
    addQuestion,
    removeQuestion,
    updateOption,
    addOption,
    removeOption,
    toggleCorrect,
    updateQuestion,
    removeQuestionImage,
    diagnostics,
    bankCheckResults,
    saving,
    autosaving,
    lastSavedAt,
    error,
    isSubmitBlocked,
    canSaveDraft,
    isStudentMode,
    importEnabled,
    showImportPanel, setShowImportPanel,
    handleApplyImportedQuiz,
    setHasImportBlockingErrors,
    setImportPreviewErrors,
    setIsImportProcessing,
    scrollToQuestion,
    handleSubmit,
    handleSaveDraft,
    showBankWarning, setShowBankWarning,
    usageInfo, clearUsageInfo,
    pendingQuestionData,
    applyPendingQuestionUpdate,
  } = useQuizEditor({
    initialData,
    quizId,
    categories,
    mode,
    createEndpoint,
    updateEndpointBuilder,
    redirectOnPublish,
    cancelPath,
    allowDraft,
    enableAutosave,
    onBeforeSubmit,
    registerApplyResolutions,
    onServerConflict,
  })

  return (
    <div className="p-4 sm:p-8 bg-[#F9F9F7] min-h-screen">
      <div className="w-full mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 w-full space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-[#5D7B6F]">
                {quizId ? 'Chỉnh sửa Quiz' : 'Tạo Quiz mới'}
              </h1>
            </div>

            <EditorMetadataForm
              form={form}
              setForm={setForm}
              categories={categories}
              isStudentMode={isStudentMode}
            />

            {!isStudentMode && !form.category_id && (
              <Card className="bg-gray-50 border-gray-300">
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">
                    Vui lòng chọn môn học ở trên để tiếp tục tạo quiz
                  </p>
                </CardContent>
              </Card>
            )}

            {(isStudentMode || form.category_id) && (
              <>
                {importEnabled && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[#A4C3A2] text-[#5D7B6F]"
                      onClick={() => {
                        setShowImportPanel((prev) => !prev)
                        setTimeout(() => {
                          const panel = document.getElementById('quiz-import-panel')
                          panel?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 0)
                      }}
                    >
                      {showImportPanel ? 'Ẩn upload file JSON/TXT' : 'Upload file JSON/TXT'}
                    </Button>
                  </div>
                )}

                {importEnabled && showImportPanel && (
                  <QuizImportPanel
                    onApply={handleApplyImportedQuiz}
                    onValidationStateChange={setHasImportBlockingErrors}
                    onPreviewDiagnosticsChange={(errors) =>
                      setImportPreviewErrors(errors.map((item) => ({ code: item.code, message: item.message, questionIndex: item.questionIndex })))
                    }
                    onProcessingStateChange={setIsImportProcessing}
                    categoryId={form.category_id}
                    mode={mode}
                  />
                )}

                <div className="space-y-4">
                  {form.questions.map((q, i) => (
                    <QuestionEditorCard
                      key={i}
                      question={q}
                      index={i}
                      updateQuestion={updateQuestion}
                      removeQuestion={removeQuestion}
                      updateOption={updateOption}
                      addOption={addOption}
                      removeOption={removeOption}
                      toggleCorrect={toggleCorrect}
                      removeQuestionImage={removeQuestionImage}
                      error={diagnostics.errors.find(e => e.questionIndex === i)}
                      isQuestionBankMatch={bankCheckResults[i]}
                    />
                  ))}
                </div>

                <div className="flex justify-center pt-8">
                  <Button
                    type="button"
                    onClick={addQuestion}
                    className="h-16 px-12 rounded-2xl bg-white border-2 border-[#5D7B6F] text-[#5D7B6F] font-black uppercase tracking-widest hover:bg-[#5D7B6F] hover:text-white transition-all shadow-lg hover:shadow-xl"
                  >
                    + Thêm câu hỏi tiếp theo
                  </Button>
                </div>
              </>
            )}
          </div>

          <aside className="w-full lg:w-80 space-y-6 lg:sticky lg:top-8">
            <EditorProgressHub
              diagnostics={{
                total: diagnostics.summary.totalQuestions,
                complete: diagnostics.summary.completedQuestions,
                percent: diagnostics.progressPercent,
                isValid: diagnostics.isValid,
                errors: [...diagnostics.errors, ...diagnostics.warnings]
              }}
              autosaving={autosaving}
              lastSavedAt={lastSavedAt}
              onScrollToQuestion={scrollToQuestion}
            />

            <EditorControlPanel
              targetInput={targetInput}
              setTargetInput={setTargetInput}
              applyTargetCount={applyTargetCount}
              addQuestion={addQuestion}
              onSaveDraft={handleSaveDraft}
              onSubmit={handleSubmit}
              saving={saving}
              isSubmitBlocked={isSubmitBlocked}
              canSaveDraft={canSaveDraft}
              isStudentMode={isStudentMode}
              hasCategory={!!form.category_id}
            />
          </aside>
        </div>
      </div>

      <QuestionBankWarning
        open={showBankWarning}
        onOpenChange={(open) => {
          if (!open) {
            setShowBankWarning(false)
            clearUsageInfo()
          }
        }}
        categoryId={form.category_id}
        oldQuestionId={usageInfo?.question_id || ''}
        newQuestion={pendingQuestionData || { text: '', options: [], correct_answer: [] }}
        usageInfo={usageInfo}
        onUpdateThisOnly={applyPendingQuestionUpdate}
        onUpdateAll={applyPendingQuestionUpdate}
      />

      {error && !autosaving && (
        <div className="fixed bottom-8 left-8 right-8 lg:left-auto lg:right-8 lg:w-96 bg-red-50 border-2 border-red-200 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-bold text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
