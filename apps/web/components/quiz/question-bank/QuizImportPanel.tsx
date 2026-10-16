'use client'

import * as React from 'react'
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { QuestionStructureReportCard } from '@/components/quiz/question-bank/QuestionStructureReportCard'
import { QuizImportDropzone } from '@/components/quiz/question-bank/QuizImportDropzone'
import { QuizImportConflictResolver } from '@/components/quiz/question-bank/QuizImportConflictResolver'
import {
  useQuizImport,
  type ImportedQuestion,
  type ImportedQuiz,
  type ImportDiagnostic,
  type ImportPreviewResponse,
  type BankCheckResult,
  type UseQuizImportOptions,
} from '@/hooks/quiz/useQuizImport'

export type { ImportedQuestion, ImportedQuiz, ImportDiagnostic, ImportPreviewResponse, BankCheckResult }

interface Props {
  onApply: (
    quiz: ImportedQuiz,
    importInfo?: {
      bankCheck?: BankCheckResult | null
      previewSummary?: {
        totalQuestions: number
        validQuestions: number
        errors: number
        warnings: number
      }
      diagnostics?: ImportDiagnostic[]
    }
  ) => void
  onValidationStateChange?: (hasBlockingErrors: boolean) => void
  onPreviewDiagnosticsChange?: (errors: ImportDiagnostic[]) => void
  onProcessingStateChange?: (isProcessing: boolean) => void
  categoryId?: string
  courseCode?: string
  description?: string
  mode?: 'admin' | 'student'
}

export function QuizImportPanel({
  onApply,
  onValidationStateChange,
  onPreviewDiagnosticsChange,
  onProcessingStateChange,
  categoryId,
  courseCode,
  description,
  mode = 'admin',
}: Readonly<Props>) {
  const {
    file,
    fileSnapshot,
    loading,
    preparingFile,
    downloading,
    error,
    preview,
    bankCheck,
    checkingBank,
    conflictChoice,
    applying,
    confirmingConflicts,
    conflictsConfirmed,
    isDragging,
    fileInputRef,
    processSelectedFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDownloadSample,
    handlePreview,
    handleApply,
    handleConfirmConflictChoices,
    handleConflictChoiceChange,
  } = useQuizImport({
    onApply,
    onValidationStateChange,
    onPreviewDiagnosticsChange,
    onProcessingStateChange,
    categoryId,
    courseCode,
    description,
    mode,
  })

  return (
    <Card id="quiz-import-panel" className="bg-card border-border text-card-foreground">
      <CardHeader className="pb-3">
        <CardTitle className="text-primary text-lg flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload JSON/TXT Quiz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <QuizImportDropzone
          file={file}
          fileSnapshot={fileSnapshot}
          loading={loading}
          preparingFile={preparingFile}
          downloading={downloading}
          isDragging={isDragging}
          fileInputRef={fileInputRef}
          onDownloadSample={handleDownloadSample}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onSelectFile={processSelectedFile}
          onPreview={handlePreview}
        />

        {error && (
          <div className="text-sm text-destructive bg-incorrect-bg border border-incorrect-border rounded-md p-2">
            {error}
          </div>
        )}

        {preview && (
          <div className="space-y-3 rounded-md border border-border p-3 bg-primary/5">
            {preview.structureReport && (
              <QuestionStructureReportCard
                report={preview.structureReport}
                importSummary={{
                  totalQuestions: preview.summary.totalQuestions,
                  validQuestions: preview.summary.validQuestions,
                  errors: preview.summary.errors,
                  warnings: preview.summary.warnings,
                  isValid: preview.isValid,
                }}
                bankStatus={
                  bankCheck
                    ? {
                        sameAnswerCount: bankCheck.same_answer_conflicts,
                        differentAnswerCount: bankCheck.different_answer_conflicts,
                      }
                    : undefined
                }
                diagnostics={preview.diagnostics}
              />
            )}

            {/* Question Bank Check Loading & Status */}
            {checkingBank && (
              <div className="flex items-center gap-2 text-xs text-info-fg bg-info-bg border border-info-border rounded-md p-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Checking question bank...
              </div>
            )}

            {bankCheck && /(Ch\u01B0a ch\u1ECDn m\u00F4n h\u1ECDc|No subject selected)/i.test(bankCheck.summary) && (
              <div className="bg-warning-bg border border-warning-border rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning-fg flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-warning-fg mb-1">No Subject Selected</p>
                    <p className="text-warning-fg">
                      Please select a subject above before uploading files to check for duplicate questions in the Question Bank.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Conflict Resolver */}
            {bankCheck && (
              <QuizImportConflictResolver
                bankCheck={bankCheck}
                conflictChoice={conflictChoice}
                onConflictChoiceChange={handleConflictChoiceChange}
              />
            )}

            {bankCheck && bankCheck.same_answer_conflicts > 0 && (
              <div className="bg-warning-bg border border-warning-border rounded-md p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-warning-fg flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-warning-fg mb-1">
                      ✓ {bankCheck.same_answer_conflicts} questions already in question bank
                    </p>
                    <p className="text-warning-fg">
                      These questions already exist with matching answers. Safe to reuse.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {bankCheck && bankCheck.conflicts_found === 0 && !/(Ch\u01B0a ch\u1ECDn m\u00F4n h\u1ECDc|No subject selected)/i.test(bankCheck.summary) && (
              <div className="bg-success-bg border border-success-border rounded-md p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success-fg flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-success-fg">✅ All questions are new</p>
                  </div>
                </div>
              </div>
            )}

            {/* Diagnostic list */}
            <div className="max-h-40 overflow-y-auto space-y-1">
              {preview.diagnostics.map((item, idx) => (
                <div key={`${item.code}-${idx}`} className="text-xs flex items-start gap-2">
                  {item.level === 'error' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-warning-fg mt-0.5" />
                  )}
                  <span className={item.level === 'error' ? 'text-destructive' : 'text-warning-fg'}>
                    {item.questionIndex === undefined ? '' : `Question ${item.questionIndex + 1}: `}
                    {item.message}
                  </span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
              {bankCheck && bankCheck.different_answer_conflicts > 0 && (
                <Button
                  type="button"
                  variant={conflictsConfirmed ? 'outline' : 'default'}
                  onClick={() => void handleConfirmConflictChoices()}
                  disabled={!preview.isValid || applying || confirmingConflicts || conflictsConfirmed}
                  className={conflictsConfirmed ? 'border-border' : 'bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer'}
                >
                  {confirmingConflicts ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Synchronizing...
                    </span>
                  ) : conflictsConfirmed ? (
                    'Choices Confirmed'
                  ) : (
                    'Confirm Answer Choices'
                  )}
                </Button>
              )}
              <Button
                type="button"
                onClick={() => void handleApply()}
                disabled={
                  !preview.isValid ||
                  applying ||
                  confirmingConflicts ||
                  Boolean(bankCheck && bankCheck.different_answer_conflicts > 0 && !conflictsConfirmed)
                }
                className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
              >
                {applying ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Applying...
                  </span>
                ) : (
                  'Apply to Form'
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
