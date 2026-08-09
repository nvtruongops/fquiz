'use client'

import React from 'react'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Hash, Plus, Trash2, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'

interface EditorControlPanelProps {
  targetInput: string
  setTargetInput: (val: string) => void
  applyTargetCount: (val: string) => void
  addQuestion: () => void
  onSaveDraft: () => void
  onSubmit: (e: React.FormEvent) => void
  saving: boolean
  isSubmitBlocked: boolean
  canSaveDraft: boolean
  isStudentMode: boolean
  hasCategory: boolean
}

export function EditorControlPanel({
  targetInput,
  setTargetInput,
  applyTargetCount,
  addQuestion,
  onSaveDraft,
  onSubmit,
  saving,
  isSubmitBlocked,
  canSaveDraft,
  isStudentMode,
  hasCategory
}: EditorControlPanelProps) {
  if (!isStudentMode && !hasCategory) return null

  return (
    <Card className="bg-card border border-border shadow-xs rounded-[32px] overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="space-y-2">
          <label htmlFor="question-count-input" className="text-xs font-black uppercase tracking-widest text-muted-foreground block">Số lượng câu hỏi</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="question-count-input"
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onBlur={(e) => applyTargetCount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyTargetCount(targetInput)}
                className="pl-9 rounded-xl border-border focus:ring-primary"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => applyTargetCount(targetInput)}
              className="rounded-xl border-border text-foreground hover:bg-muted"
            >
              Đặt
            </Button>
          </div>
        </div>

        <Button
          type="button"
          onClick={addQuestion}
          className="w-full h-12 rounded-xl bg-card border-2 border-primary text-primary font-bold hover:bg-primary hover:text-primary-foreground transition-all gap-2 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Thêm 1 câu hỏi
        </Button>

        <div className="h-px bg-border my-2" />

        <div className="space-y-3">
          <Button
            type="submit"
            onClick={onSubmit}
            disabled={isSubmitBlocked}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                {isStudentMode ? 'Tạo Quiz' : 'Công khai ngay'}
              </>
            )}
          </Button>

          {canSaveDraft && (
            <Button
              type="button"
              variant="ghost"
              onClick={onSaveDraft}
              disabled={isSubmitBlocked}
              className="w-full h-12 rounded-xl text-primary font-bold hover:bg-primary/10 transition-all cursor-pointer"
            >
              Lưu bản nháp
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
