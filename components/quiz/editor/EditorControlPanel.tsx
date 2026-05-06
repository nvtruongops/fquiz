'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Hash, Plus, Trash2, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <Card className="bg-white border-none shadow-xl shadow-[#5D7B6F]/5 rounded-[32px] overflow-hidden ring-1 ring-gray-100">
      <CardContent className="p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-[#5D7B6F]/60 block">Số lượng câu hỏi</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onBlur={(e) => applyTargetCount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyTargetCount(targetInput)}
                className="pl-9 rounded-xl border-[#A4C3A2] focus:ring-[#5D7B6F]"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => applyTargetCount(targetInput)}
              className="rounded-xl border-[#A4C3A2] text-[#5D7B6F] hover:bg-[#A4C3A2]/10"
            >
              Đặt
            </Button>
          </div>
        </div>

        <Button
          type="button"
          onClick={addQuestion}
          className="w-full h-12 rounded-xl bg-white border-2 border-[#5D7B6F] text-[#5D7B6F] font-bold hover:bg-[#5D7B6F] hover:text-white transition-all gap-2"
        >
          <Plus className="w-5 h-5" />
          Thêm 1 câu hỏi
        </Button>

        <div className="h-px bg-gray-100 my-2" />

        <div className="space-y-3">
          <Button
            type="submit"
            onClick={onSubmit}
            disabled={isSubmitBlocked}
            className="w-full h-14 rounded-2xl bg-[#5D7B6F] text-white font-black uppercase tracking-widest shadow-lg shadow-[#5D7B6F]/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3"
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
              className="w-full h-12 rounded-xl text-[#5D7B6F] font-bold hover:bg-[#5D7B6F]/5 transition-all"
            >
              Lưu bản nháp
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
