import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Database,
  X,
} from 'lucide-react'
import { UploadDropZone } from './upload/UploadDropZone'
import { UploadQuickJumpBar } from './upload/UploadQuickJumpBar'
import { UploadQuestionBreakdownItem } from './upload/UploadQuestionBreakdownItem'
import type { ParsedFilePreview } from '@/hooks/quiz/types'

interface QuizEditorFileUploadModalProps {
  open: boolean
  onClose: () => void
  isParsingFile: boolean
  filePreview: ParsedFilePreview | null
  setFilePreview: (preview: ParsedFilePreview | null) => void
  reviewFilter: 'all' | 'conflict' | 'new' | 'reused'
  setReviewFilter: (filter: 'all' | 'conflict' | 'new' | 'reused') => void
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent) => void
  onToggleConflictChoice: (qIndex: number, choice: 'file' | 'bank') => void
  onApplyFilePreview: () => void
  onScrollToReviewQuestion: (qIndex: number) => void
}

export function QuizEditorFileUploadModal({
  open,
  onClose,
  isParsingFile,
  filePreview,
  setFilePreview,
  reviewFilter,
  setReviewFilter,
  fileInputRef,
  onFileSelect,
  onDrop,
  onToggleConflictChoice,
  onApplyFilePreview,
  onScrollToReviewQuestion,
}: QuizEditorFileUploadModalProps) {
  const filteredReviewDetails = useMemo(() => {
    if (!filePreview?.checkResult?.details) return []
    if (reviewFilter === 'all') return filePreview.checkResult.details
    return filePreview.checkResult.details.filter((d) => d.status === reviewFilter)
  }, [filePreview, reviewFilter])

  const conflictIndices = useMemo(() => {
    if (!filePreview?.checkResult?.details) return []
    return filePreview.checkResult.details.filter((d) => d.status === 'conflict').map((d) => d.questionIndex)
  }, [filePreview])

  const newIndices = useMemo(() => {
    if (!filePreview?.checkResult?.details) return []
    return filePreview.checkResult.details.filter((d) => d.status === 'new').map((d) => d.questionIndex)
  }, [filePreview])

  const reusedIndices = useMemo(() => {
    if (!filePreview?.checkResult?.details) return []
    return filePreview.checkResult.details.filter((d) => d.status === 'reused').map((d) => d.questionIndex)
  }, [filePreview])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="max-w-5xl w-full max-h-[94vh] flex flex-col border-border bg-card shadow-2xl overflow-hidden rounded-2xl">
        <CardHeader className="p-5 pb-3.5 border-b border-border flex flex-row items-center justify-between shrink-0 bg-muted/20">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-primary" />
              Upload &amp; Đối chiếu Ngân hàng Câu hỏi (.TXT / .JSON)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Tự động nhận diện Mô tả, Câu hỏi, Phương án, Đáp án đúng &amp; đối chiếu với ngân hàng môn học
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onClose()
              setFilePreview(null)
            }}
            className="h-8 w-8 p-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-5 space-y-4 overflow-y-auto flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!filePreview ? (
            <UploadDropZone
              isParsingFile={isParsingFile}
              fileInputRef={fileInputRef}
              onFileSelect={onFileSelect}
              onDrop={onDrop}
            />
          ) : (
            <div className="space-y-4">
              {/* Top Overview Bar */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-foreground flex items-center gap-2">
                        {filePreview.fileName}
                        <span className="text-xs font-mono text-muted-foreground font-normal">
                          ({filePreview.fileSize})
                        </span>
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Đã nhận diện: <strong>{filePreview.rawQuestions.length}</strong> câu hỏi
                      </p>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setReviewFilter('all')}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                        reviewFilter === 'all'
                          ? 'bg-foreground text-background border-foreground shadow-xs'
                          : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Tất cả ({filePreview.rawQuestions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('conflict')}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                        reviewFilter === 'conflict'
                          ? 'bg-destructive text-destructive-foreground border-destructive shadow-xs'
                          : 'bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20'
                      }`}
                    >
                      Mâu thuẫn ({conflictIndices.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('new')}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                        reviewFilter === 'new'
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                      }`}
                    >
                      Câu mới ({newIndices.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('reused')}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                        reviewFilter === 'reused'
                          ? 'bg-success-fg text-success-text border-success-fg shadow-xs'
                          : 'bg-success-bg border-success-border text-success-fg hover:bg-success-bg/80'
                      }`}
                    >
                      Trùng bank ({reusedIndices.length})
                    </button>
                  </div>
                </div>

                <UploadQuickJumpBar
                  conflictIndices={conflictIndices}
                  newIndices={newIndices}
                  reusedIndices={reusedIndices}
                  onScrollToReviewQuestion={onScrollToReviewQuestion}
                />
              </div>

              {/* Question Bank Analysis Breakdown List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-primary" />
                    Danh sách câu hỏi đối chiếu (Hiển thị {filteredReviewDetails.length} / {filePreview.rawQuestions.length} câu):
                  </span>
                  {reviewFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setReviewFilter('all')}
                      className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Hiển thị tất cả câu hỏi
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {filteredReviewDetails.map((item) => (
                    <UploadQuestionBreakdownItem
                      key={item.questionIndex}
                      item={item}
                      choice={filePreview.conflictResolutions[item.questionIndex] || 'file'}
                      onToggleConflictChoice={onToggleConflictChoice}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {filePreview && (
          <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFilePreview(null)}
              className="cursor-pointer"
            >
              Chọn file khác
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onApplyFilePreview}
              className="font-bold gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Áp dụng {filePreview.rawQuestions.length} câu vào đề thi
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
