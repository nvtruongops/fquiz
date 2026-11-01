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
import { useTranslations } from '@fquiz/ui/i18n'

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
}

export function QuizImportPanel({
  onApply,
  onValidationStateChange,
  onPreviewDiagnosticsChange,
  onProcessingStateChange,
  categoryId,
  courseCode,
  description,
}: Readonly<Props>) {
  const t = useTranslations()
  const getDiagnosticText = (item: ImportDiagnostic) => {
    switch (item.code) {
      case 'NO_QUESTIONS': return t('quizImport.diagNoQuestions')
      case 'UNKNOWN_TOP_LEVEL_FIELD': return t('quizImport.diagUnknownTopField', { field: item.message.split(': ').slice(1).join(': ') })
      case 'MISSING_QUIZ_META': return t('quizImport.diagMissingMetadata')
      case 'UNKNOWN_QUIZ_META_FIELD': return t('quizImport.diagUnknownMetadataField', { field: item.message.split(': ').slice(1).join(': ') })
      case 'INVALID_QUESTIONS_ARRAY': return t('quizImport.diagQuestionsNotArray')
      case 'MISSING_COURSE_CODE': return t('quizImport.diagMissingCourseCode')
      case 'COURSE_CODE_TOO_LONG': return t('diagnostic.courseCodeTooLong')
      case 'INVALID_COURSE_CODE': return t('diagnostic.courseCodeInvalid')
      case 'MISSING_CATEGORY_ID': return t('quizImport.diagMissingCategory')
      case 'MISSING_DESCRIPTION': return t('quizImport.diagMissingDescription')
      case 'CATEGORY_ID_NOT_OBJECT_ID': return t('quizImport.diagInvalidCategory')
      case 'UNKNOWN_QUESTION_FIELD': return t('quizImport.diagUnknownQuestionField', { field: item.message.split(': ').slice(1).join(': ') })
      case 'MISSING_QUESTION_TEXT': return t('diagnostic.questionTextRequired')
      case 'INSUFFICIENT_OPTIONS': return t('quizImport.diagInsufficientOptions')
      case 'INVALID_CORRECT_ANSWER_TOKEN': return t('quizImport.diagInvalidAnswerToken')
      case 'MISSING_CORRECT_ANSWER': return t('diagnostic.questionMissingAnswer')
      case 'CORRECT_ANSWER_OUT_OF_RANGE': return t('quizImport.diagAnswerOutOfRange')
      case 'DUPLICATE_CORRECT_ANSWER': return t('quizImport.diagDuplicateAnswers')
      case 'EMPTY_OPTION_IN_MIDDLE': return t('diagnostic.optionGap')
      case 'DUPLICATE_OPTION': return t('diagnostic.questionDuplicateOption')
      case 'DUPLICATE_QUESTION': return t('quizImport.diagDuplicateQuestion')
      default: return t('quizImport.diagGeneric')
    }
  }
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
  })

  return (
    <Card id="quiz-import-panel" className="bg-card border-border text-card-foreground">
      <CardHeader className="pb-3">
        <CardTitle className="text-primary text-lg flex items-center gap-2">
          <Upload className="w-4 h-4" />
          {t('quizImport.uploadQuiz')}
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
                {t('quizImport.checkingBank')}
              </div>
            )}

            {bankCheck && !categoryId && (
              <div className="bg-warning-bg border border-warning-border rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning-fg flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-warning-fg mb-1">{t('quizImport.noSubject')}</p>
                    <p className="text-warning-fg">
                      {t('quizImport.selectSubject')}
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
                      ✓ {t('quizImport.alreadyInBank', { count: bankCheck.same_answer_conflicts })}
                    </p>
                    <p className="text-warning-fg">
                      {t('quizImport.reusableQuestions')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {bankCheck && bankCheck.conflicts_found === 0 && Boolean(categoryId) && (
              <div className="bg-success-bg border border-success-border rounded-md p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success-fg flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-success-fg">{t('quizImport.allNew')}</p>
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
                    {item.questionIndex === undefined ? '' : `${t('quizImport.question', { number: item.questionIndex + 1 })}: `}
                    {getDiagnosticText(item)}
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
                      {t('quizImport.synchronizing')}
                    </span>
                  ) : conflictsConfirmed ? (
                    t('quizImport.choicesConfirmed')
                  ) : (
                    t('quizImport.confirmChoices')
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
                    {t('quizImport.applying')}
                  </span>
                ) : (
                  t('quizImport.applyToForm')
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
