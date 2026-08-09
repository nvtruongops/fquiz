'use client'

import React from 'react'
import { Card } from '@/components/shared/ui/card'
import { Progress } from '@/components/shared/ui/progress'
import { Badge } from '@/components/shared/ui/badge'
import { ScrollArea } from '@/components/shared/ui/scroll-area'
import { LayoutDashboard, Loader2, CheckCircle2, AlertTriangle, AlertCircle, ChevronRight, History } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'

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
  autosaving: boolean
  lastSavedAt: Date | null
  onScrollToQuestion: (idx: number) => void
}

export function EditorProgressHub({
  diagnostics,
  autosaving,
  lastSavedAt,
  onScrollToQuestion
}: EditorProgressHubProps) {
  return (
    <Card className="bg-card border border-border shadow-xs rounded-[32px] overflow-hidden">
      <div className="p-5 bg-primary/10 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-primary" />
          <span className="text-sm font-black text-primary uppercase tracking-tight">Bảng điều khiển hoàn thiện</span>
        </div>
        <div className="flex items-center gap-4">
          {autosaving ? (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Đang tự động lưu...
            </div>
          ) : lastSavedAt && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              Đã lưu {lastSavedAt.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-5 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-foreground">Độ hoàn thiện</span>
            <span className="font-black text-primary">
              {diagnostics.percent}%
            </span>
          </div>
          <Progress value={diagnostics.percent} className="h-2 bg-muted" />
          <p className="text-[10px] text-muted-foreground text-center font-medium">
            {diagnostics.complete} / {diagnostics.total} câu hỏi đã hợp lệ
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Chỉ số chất lượng</span>
            <Badge variant="outline" className={cn(
              "text-[10px] uppercase font-bold",
              diagnostics.isValid ? "bg-primary/10 text-primary border-primary/20" : "bg-destructive/10 text-destructive border-destructive/20"
            )}>
              {diagnostics.isValid ? 'Sẵn sàng công khai' : 'Cần hoàn thiện thêm'}
            </Badge>
          </div>

          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-2">
              {diagnostics.errors.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-primary mx-auto opacity-30" />
                  <p className="text-xs text-muted-foreground font-medium">Tuyệt vời! Không có lỗi nào được tìm thấy.</p>
                </div>
              ) : (
                diagnostics.errors.map((err, i) => (
                  <button
                    key={i}
                    onClick={() => typeof err.questionIndex === 'number' && onScrollToQuestion(err.questionIndex)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 group cursor-pointer",
                      err.severity === 'error' ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-warning-bg border-warning-border text-warning-fg"
                    )}
                  >
                    <div className="flex gap-2">
                      {err.severity === 'error' ? (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            {typeof err.questionIndex === 'number' ? `Câu ${err.questionIndex + 1}` : 'Toàn bộ'}
                          </span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs font-medium leading-relaxed">{err.message}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="pt-4 border-t border-border">
           <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <History className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Lịch sử thay đổi</span>
           </div>
           <div className="space-y-2">
              <div className="p-3 bg-muted/50 rounded-xl border border-border flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground">Phiên bản hiện tại</span>
                <span className="text-[10px] font-mono text-foreground">v1.0.4</span>
              </div>
           </div>
        </div>
      </div>
    </Card>
  )
}
