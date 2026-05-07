'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LayoutDashboard, Loader2, CheckCircle2, AlertTriangle, AlertCircle, ChevronRight, History } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <Card className="bg-white border-none shadow-xl shadow-[#5D7B6F]/5 rounded-[32px] overflow-hidden ring-1 ring-gray-100">
      <div className="p-5 bg-[#5D7B6F]/5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-[#5D7B6F]" />
          <span className="text-sm font-black text-[#5D7B6F] uppercase tracking-tight">Bảng điều khiển hoàn thiện</span>
        </div>
        <div className="flex items-center gap-4">
          {autosaving ? (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Đang tự động lưu...
            </div>
          ) : lastSavedAt && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Đã lưu {lastSavedAt.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-5 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-gray-600">Độ hoàn thiện</span>
            <span className={cn(
              "font-black",
              diagnostics.percent === 100 ? "text-green-600" : "text-[#5D7B6F]"
            )}>
              {diagnostics.percent}%
            </span>
          </div>
          <Progress value={diagnostics.percent} className="h-2 bg-gray-100" />
          <p className="text-[10px] text-gray-400 text-center font-medium">
            {diagnostics.complete} / {diagnostics.total} câu hỏi đã hợp lệ
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Chỉ số chất lượng</span>
            <Badge variant="outline" className={cn(
              "text-[10px] uppercase font-bold",
              diagnostics.isValid ? "bg-green-50 text-green-600 border-green-200" : "bg-orange-50 text-orange-600 border-orange-200"
            )}>
              {diagnostics.isValid ? 'Sẵn sàng công khai' : 'Cần hoàn thiện thêm'}
            </Badge>
          </div>

          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-2">
              {diagnostics.errors.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto opacity-20" />
                  <p className="text-xs text-gray-400 font-medium">Tuyệt vời! Không có lỗi nào được tìm thấy.</p>
                </div>
              ) : (
                diagnostics.errors.map((err, i) => (
                  <button
                    key={i}
                    onClick={() => typeof err.questionIndex === 'number' && onScrollToQuestion(err.questionIndex)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 group",
                      err.severity === 'error' ? "bg-red-50 border-red-100 text-red-700" : "bg-orange-50 border-orange-100 text-orange-700"
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

        <div className="pt-4 border-t border-gray-100">
           <div className="flex items-center gap-2 text-gray-400 mb-3">
              <History className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Lịch sử thay đổi</span>
           </div>
           <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500">Phiên bản hiện tại</span>
                <span className="text-[10px] font-mono text-gray-400">v1.0.4</span>
              </div>
           </div>
        </div>
      </div>
    </Card>
  )
}
