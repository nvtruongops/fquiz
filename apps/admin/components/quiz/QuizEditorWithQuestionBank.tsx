'use client'

import React from 'react'
import { useQuizEditorForm } from '@/hooks/quiz/useQuizEditorForm'
import { useQuizFileUpload } from '@/hooks/quiz/useQuizFileUpload'
import { QuizEditorHeader } from './editor/QuizEditorHeader'
import { QuizEditorMetadataCard } from './editor/QuizEditorMetadataCard'
import { QuizEditorQuestionList } from './editor/QuizEditorQuestionList'
import { QuizEditorDiagnosticsHub } from './editor/QuizEditorDiagnosticsHub'
import { QuizEditorStickyActionBar } from './editor/QuizEditorStickyActionBar'
import { QuizEditorFileUploadModal } from './editor/QuizEditorFileUploadModal'
import { QuizEditorSyncConfirmModal } from './editor/QuizEditorSyncConfirmModal'
import { QuestionConflictModal } from './QuestionConflictModal'
import type { Category, QuestionItem } from '@/hooks/quiz/types'

export type { Category, QuestionItem }

interface QuizEditorWithQuestionBankProps {
  categories: Category[]
  initialData?: any
  quizId?: string
}

export function QuizEditorWithQuestionBank({
  categories,
  initialData,
  quizId,
}: QuizEditorWithQuestionBankProps) {
  const form = useQuizEditorForm({ initialData, quizId })

  const fileUpload = useQuizFileUpload({
    categoryId: form.categoryId,
    description: form.description,
    setDescription: form.setDescription,
    courseCode: form.courseCode,
    setCourseCode: form.setCourseCode,
    setQuestions: form.setQuestions,
  })

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* 1. Header Navigation & Quick Actions */}
      <QuizEditorHeader
        quizId={quizId}
        onOpenUploadModal={fileUpload.handleOpenUploadModal}
      />

      {/* 2. Step 1 Category Requirement Reminder Banner */}
      {!form.isCategorySelected && (
        <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300 shadow-xs">
          <div className="text-xs text-foreground">
            <strong className="font-bold text-primary block text-sm">Bước 1: Chọn Môn học để bắt đầu</strong>
            <span>Vui lòng chọn Môn học trước để hệ thống kích hoạt bảng soạn thảo và đối chiếu với Ngân hàng câu hỏi của môn đó.</span>
          </div>
        </div>
      )}

      {/* 3. Main Two-Column Layout (LEFT: Form Metadata & Questions | RIGHT: Diagnostic Hub) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Question List */}
        <div className="lg:col-span-8 space-y-6">
          <QuizEditorMetadataCard
            categories={categories}
            categoryId={form.categoryId}
            onSelectCategory={form.setCategoryId}
            courseCode={form.courseCode}
            onChangeCourseCode={form.setCourseCode}
            isCheckingCode={form.isCheckingCode}
            codeDuplicateInfo={form.codeDuplicateInfo}
            description={form.description}
            onChangeDescription={form.setDescription}
            targetCount={form.targetCount}
            onChangeTargetCount={form.setTargetCount}
            onApplyTargetCount={form.handleApplyTargetCount}
            currentQuestionsCount={form.questions.length}
          />

          <QuizEditorQuestionList
            questions={form.questions}
            isCategorySelected={form.isCategorySelected}
            onAddQuestion={form.handleAddQuestion}
            onMoveQuestion={form.handleMoveQuestion}
            onRemoveQuestion={form.handleRemoveQuestion}
            onUpdateQuestionText={form.handleUpdateQuestionText}
            onUpdateOption={form.handleUpdateOption}
            onAddOption={form.handleAddOption}
            onRemoveOption={form.handleRemoveOption}
            onToggleCorrect={form.handleToggleCorrect}
            onUpdateExplanation={(index, explanation) => {
              form.setQuestions((prev) => {
                const clone = [...prev]
                clone[index] = { ...clone[index], explanation }
                return clone
              })
            }}
          />
        </div>

        {/* Right Column: Sticky Diagnostics Hub */}
        <QuizEditorDiagnosticsHub
          diagnostics={form.diagnostics}
          questions={form.questions}
          isCheckingBank={form.isCheckingBank}
          bankStatus={form.bankStatus}
          onScrollToQuestion={form.scrollToQuestion}
        />
      </div>

      {/* 4. Sticky Bottom Action Bar */}
      <QuizEditorStickyActionBar
        isSubmitting={form.isSubmitting}
        submitAction={form.submitAction}
        isCategorySelected={form.isCategorySelected}
        isFormValid={form.diagnostics.isValid}
        onSubmit={form.handleSubmit}
      />

      {/* 5. Upload & Question Bank Review Modal */}
      <QuizEditorFileUploadModal
        open={fileUpload.showUploadModal}
        onClose={() => fileUpload.setShowUploadModal(false)}
        isParsingFile={fileUpload.isParsingFile}
        filePreview={fileUpload.filePreview}
        setFilePreview={fileUpload.setFilePreview}
        reviewFilter={fileUpload.reviewFilter}
        setReviewFilter={fileUpload.setReviewFilter}
        fileInputRef={fileUpload.fileInputRef}
        onFileSelect={fileUpload.handleFileSelect}
        onDrop={fileUpload.handleDrop}
        onToggleConflictChoice={fileUpload.handleToggleConflictChoice}
        onApplyFilePreview={fileUpload.handleClickApplyFilePreview}
        onScrollToReviewQuestion={fileUpload.scrollToReviewQuestion}
      />

      {/* 6. Sync Overwrite Confirmation Modal */}
      <QuizEditorSyncConfirmModal
        open={fileUpload.showSyncConfirmModal}
        onClose={() => fileUpload.setShowSyncConfirmModal(false)}
        isSyncing={fileUpload.isSyncing}
        filePreview={fileUpload.filePreview}
        fileConflictItems={fileUpload.fileConflictItems}
        onConfirmSync={fileUpload.executeApplyFilePreview}
      />

      {/* 7. Question Conflict Warning Modal (Submit Interceptor) */}
      <QuestionConflictModal
        open={form.showConflictModal}
        onOpenChange={form.setShowConflictModal}
        conflicts={form.bankStatus.conflicts}
        totalConflicts={form.bankStatus.conflicts.length}
        onResolve={(action) => {
          form.setShowConflictModal(false)
          if (action === 'force') {
            form.handleSubmit('published', true)
          }
        }}
      />
    </div>
  )
}
