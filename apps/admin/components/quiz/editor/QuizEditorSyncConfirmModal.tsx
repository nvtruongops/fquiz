import React from 'react'
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import type { ParsedFilePreview, BankCheckDetail } from '@/hooks/quiz/types'

interface QuizEditorSyncConfirmModalProps {
  open: boolean
  onClose: () => void
  isSyncing: boolean
  filePreview: ParsedFilePreview | null
  fileConflictItems: BankCheckDetail[]
  onConfirmSync: () => void
}

export function QuizEditorSyncConfirmModal({
  open,
  onClose,
  isSyncing,
  filePreview,
  fileConflictItems,
  onConfirmSync,
}: QuizEditorSyncConfirmModalProps) {
  if (!open || !filePreview) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="max-w-xl w-full border-border bg-card shadow-2xl overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200">
        <CardHeader className="p-5 pb-3.5 border-b border-border bg-destructive/10">
          <div className="flex items-center gap-2.5 text-destructive font-bold text-base">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Xác nhận Ghi đè Đáp án Ngân hàng ({fileConflictItems.length} câu)</span>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Bạn đã chọn dùng đáp án từ file tải lên cho <strong>{fileConflictItems.length}</strong> câu hỏi bị mâu thuẫn. Khi xác nhận, đáp án mới sẽ được cập nhật vào Ngân hàng câu hỏi và toàn bộ các đề thi liên quan.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-3 max-h-[360px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Danh sách câu mâu thuẫn sẽ được cập nhật:
          </span>
          <div className="space-y-2.5">
            {fileConflictItems.map((detail) => {
              const qIndex = detail.questionIndex
              const rawQ = filePreview.rawQuestions[qIndex]
              return (
                <div
                  key={qIndex}
                  className="p-3 rounded-xl border border-border bg-muted/20 space-y-2 text-xs"
                >
                  <div className="font-bold text-foreground">
                    Câu {qIndex + 1}: {rawQ?.text}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      <span className="block font-bold text-[10px] uppercase">Đáp án mới (File upload):</span>
                      <span className="font-semibold text-xs">{detail.uploaded.answer_texts.join(', ')}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
                      <span className="block font-bold text-[10px] uppercase">Đáp án cũ (Ngân hàng):</span>
                      <span className="font-semibold text-xs">{detail.bank?.answer_texts.join(', ')}</span>
                    </div>
                  </div>
                  {detail.bank?.quizzes && detail.bank.quizzes.length > 0 && (
                    <p className="text-[11px] text-muted-foreground pt-0.5">
                      ⚠️ Sẽ tự động cập nhật lại đáp án cho {detail.bank.quizzes.length} đề thi: <strong className="font-mono text-foreground">{detail.bank.quizzes.map((qz) => qz.course_code).join(', ')}</strong>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>

        <div className="p-4 border-t border-border bg-muted/20 flex flex-col-reverse sm:flex-row justify-end gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSyncing}
            onClick={onClose}
            className="cursor-pointer"
          >
            Hủy bỏ / Quay lại
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSyncing}
            onClick={onConfirmSync}
            className="font-bold gap-2 cursor-pointer bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white shadow-sm transition-all"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Xác nhận ghi đè &amp; Áp dụng
          </Button>
        </div>
      </Card>
    </div>
  )
}
