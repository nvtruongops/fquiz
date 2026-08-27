import React from 'react'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Check, CheckCircle2 } from 'lucide-react'
import type { BankCheckDetail } from '@/hooks/quiz/types'

interface UploadQuestionBreakdownItemProps {
  item: BankCheckDetail
  choice: 'file' | 'bank'
  onToggleConflictChoice: (qIndex: number, choice: 'file' | 'bank') => void
}

export function UploadQuestionBreakdownItem({
  item,
  choice,
  onToggleConflictChoice,
}: UploadQuestionBreakdownItemProps) {
  const isConflict = item.status === 'conflict'
  const isReused = item.status === 'reused'

  return (
    <div
      id={`review-question-${item.questionIndex}`}
      className={`p-4 rounded-xl border transition-all ${
        isConflict
          ? 'border-destructive/40 bg-destructive/5 space-y-3'
          : isReused
          ? 'border-primary/30 bg-primary/5 space-y-2'
          : 'border-border bg-card space-y-2'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <span className="text-xs font-bold text-foreground leading-relaxed block">
            Câu {item.questionIndex + 1}: {item.uploaded.text}
          </span>
          {item.uploaded.explanation && (
            <p className="text-[11px] text-muted-foreground italic">
              Giải thích: {item.uploaded.explanation}
            </p>
          )}
        </div>

        <Badge
          variant={isConflict ? 'destructive' : isReused ? 'outline' : 'secondary'}
          className="text-[10px] uppercase font-bold shrink-0"
        >
          {isConflict ? 'Mâu thuẫn' : isReused ? 'Đã có trong bank' : 'Câu mới'}
        </Badge>
      </div>

      {/* Options Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-muted-foreground bg-background/80 p-3 rounded-lg border border-border/50">
        {item.uploaded.options.map((opt, oIdx) => {
          const isFileCorrect = item.uploaded.correct_answer.includes(oIdx)
          return (
            <span
              key={oIdx}
              className={`flex items-start gap-1 ${
                isFileCorrect ? 'font-bold text-primary' : ''
              }`}
            >
              <strong className="shrink-0">{String.fromCharCode(65 + oIdx)}.</strong>
              <span>{opt}</span>
              {isFileCorrect && <span className="text-primary font-bold">✓</span>}
            </span>
          )
        })}
      </div>

      {/* Conflict Resolution Controls */}
      {isConflict && item.bank && (
        <div className="p-3 bg-background border border-destructive/30 rounded-xl space-y-2.5 text-xs">
          <p className="font-bold text-destructive flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            Phát hiện mâu thuẫn đáp án với Ngân hàng câu hỏi:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Choice 1: Use File Answer */}
            <button
              type="button"
              onClick={() => onToggleConflictChoice(item.questionIndex, 'file')}
              className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                choice === 'file'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary font-medium text-foreground'
                  : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[11px] text-primary">Lựa chọn 1: Theo File Upload</span>
                {choice === 'file' && <Check className="w-3.5 h-3.5 text-primary" />}
              </div>
              <p className="text-xs font-semibold">Đáp án: {item.uploaded.answer_texts.join(', ')}</p>
            </button>

            {/* Choice 2: Use Bank Answer */}
            <button
              type="button"
              onClick={() => onToggleConflictChoice(item.questionIndex, 'bank')}
              className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                choice === 'bank'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary font-medium text-foreground'
                  : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[11px] text-primary">Lựa chọn 2: Theo Ngân hàng</span>
                {choice === 'bank' && <Check className="w-3.5 h-3.5 text-primary" />}
              </div>
              <p className="text-xs font-semibold">Đáp án: {item.bank.answer_texts.join(', ')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                (Đang dùng trong: {item.bank.quizzes.map((q) => q.course_code).join(', ')})
              </p>
            </button>
          </div>

          {choice === 'file' && (
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-primary/90 font-medium animate-in fade-in duration-150">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-primary" />
              <span>
                Tự động đồng bộ cập nhật đáp án mới này vào Ngân hàng câu hỏi và toàn bộ {item.bank.quizzes.length} đề thi liên quan
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
