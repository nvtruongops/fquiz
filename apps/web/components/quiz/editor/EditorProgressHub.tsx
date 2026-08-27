'use client'

import React from 'react'
import { Card } from '@/components/shared/ui/card'
import { Progress } from '@/components/shared/ui/progress'
import { Badge } from '@/components/shared/ui/badge'
import { ScrollArea } from '@/components/shared/ui/scroll-area'
import { LayoutDashboard, Loader2, CheckCircle2, AlertTriangle, AlertCircle, ChevronRight, History } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'

import { analyzeQuestionStructure } from '@/lib/modules/quiz/quiz-import/analyzer'

interface DiagnosticError {
  code: string
  severity: 'error' | 'warning'
  message: string
  questionIndex?: number
}

interface EditorProgressHubProps {
  diagnostics: {
    total: number
    complete: number
    percent: number
    isValid: boolean
    errors: DiagnosticError[]
  }
  questions?: Array<{ options: string[]; correct_answers?: number[]; correct_answer?: number[] | number }>
  autosaving: boolean
  lastSavedAt: Date | null
  onScrollToQuestion: (idx: number) => void
}

export function EditorProgressHub({
  diagnostics,
  questions,
  autosaving,
  lastSavedAt,
  onScrollToQuestion
}: EditorProgressHubProps) {
  const structureReport = React.useMemo(() => {
    if (!questions || questions.length === 0) return null
    const mapped = questions.map((q) => ({
      options: q.options || [],
      correct_answer: q.correct_answers ?? q.correct_answer ?? [],
    }))
    return analyzeQuestionStructure(mapped)
  }, [questions])

  return (
    <Card className="bg-card border border-border shadow-xs rounded-[24px] overflow-hidden">
      <div className="p-3.5 px-4 bg-muted/60 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-primary" />
          <span className="text-xs font-black text-foreground uppercase tracking-tight">Bảng điều khiển hoàn thiện</span>
        </div>
        <div className="flex items-center gap-2">
          {autosaving ? (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Đang lưu...
            </div>
          ) : lastSavedAt && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              Đã lưu {lastSavedAt.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 space-y-3.5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground">Độ hoàn thiện</span>
            <span className="font-black text-primary">
              {diagnostics.percent}%
            </span>
          </div>
          <Progress value={diagnostics.percent} className="h-1.5 bg-muted" />
          <p className="text-[10px] text-muted-foreground text-center font-medium">
            {diagnostics.complete} / {diagnostics.total} câu hỏi hợp lệ
          </p>
        </div>

        {structureReport && structureReport.total > 0 && (
          <div className="p-2.5 bg-muted/40 border border-border rounded-xl space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Cấu trúc file</span>
              <span className="text-foreground">{structureReport.standardCount}/{structureReport.total} chuẩn</span>
            </div>
            <div className="flex flex-wrap gap-1 text-[10px]">
              <Badge variant="outline" className="px-1.5 py-0 bg-success-bg/40 text-success-fg border-success-border/60">
                {structureReport.singleCorrectCount} câu 1 đ.án
              </Badge>
              {structureReport.multiCorrectCount > 0 && (
                <Badge variant="outline" className="px-1.5 py-0 bg-warning-bg text-warning-fg border-warning-border">
                  ⚠️ {structureReport.multiCorrectCount} câu &gt; 1 đ.án
                </Badge>
              )}
              {structureReport.fourOptionsCount === structureReport.total ? (
                <Badge variant="outline" className="px-1.5 py-0 bg-success-bg/40 text-success-fg border-success-border/60">
                  4 options
                </Badge>
              ) : (
                <Badge variant="outline" className="px-1.5 py-0 bg-warning-bg text-warning-fg border-warning-border">
                  ⚠️ {structureReport.lessThanFourOptionsCount + structureReport.moreThanFourOptionsCount} câu khác 4 opt
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Chỉ số chất lượng</span>
            <Badge variant="outline" className={cn(
              "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
              diagnostics.isValid ? "bg-success-bg text-success-fg border-success-border" : "bg-warning-bg text-warning-fg border-warning-border"
            )}>
              {diagnostics.isValid ? 'Sẵn sàng công khai' : 'Cần hoàn thiện thêm'}
            </Badge>
          </div>

          {diagnostics.errors.length === 0 ? (
            <div className="py-2 px-3 bg-success-bg/40 border border-success-border/60 rounded-lg flex items-center gap-2 text-success-fg">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-success-fg" />
              <span className="text-[11px] font-medium">Tuyệt vời! Không có lỗi nào.</span>
            </div>
          ) : (
            <ScrollArea className="max-h-[140px] pr-2">
              <div className="space-y-1.5">
                {diagnostics.errors.map((err, i) => (
                  <button
                    key={i}
                    onClick={() => typeof err.questionIndex === 'number' && onScrollToQuestion(err.questionIndex)}
                    className={cn(
                      "w-full text-left p-2 rounded-lg border transition-all hover:scale-[1.01] active:scale-95 group cursor-pointer",
                      err.severity === 'error' ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-warning-bg border-warning-border text-warning-fg"
                    )}
                  >
                    <div className="flex gap-2">
                      {err.severity === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            {typeof err.questionIndex === 'number' ? `Câu ${err.questionIndex + 1}` : 'Toàn bộ'}
                          </span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] font-medium leading-tight">{err.message}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </Card>
  )
}
