'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'

export interface ResolvedAnswer {
  questionIndex: number
  correct_answer: number[]
  options: string[]
}

interface QuestionConflictModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conflicts: any
  totalConflicts: number
  onResolve: (action: 'edit' | 'force', resolutions?: ResolvedAnswer[]) => void
}

export function QuestionConflictModal({
  open,
  onOpenChange,
  conflicts,
  totalConflicts,
  onResolve,
}: QuestionConflictModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border text-card-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive font-bold text-lg">
            <ShieldAlert className="w-5 h-5" />
            Phát hiện Mâu thuẫn Đáp án ({totalConflicts} câu)
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Một số câu hỏi trong đề thi này đã tồn tại trong Ngân hàng câu hỏi nhưng có đáp án đúng khác với dữ liệu hiện tại.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[360px] overflow-y-auto space-y-3 pr-2 my-2">
          {Array.isArray(conflicts) &&
            conflicts.map((c: any, i: number) => (
              <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2 text-xs">
                <div className="font-semibold text-foreground flex items-center justify-between">
                  <span>Câu hỏi: {c.text || `Mục ${i + 1}`}</span>
                  <Badge variant="destructive" className="text-[10px]">
                    Mâu thuẫn
                  </Badge>
                </div>
                <div className="text-muted-foreground">
                  <p className="font-medium text-foreground">Ngân hàng câu hỏi lưu đáp án khác với lựa chọn của bạn.</p>
                </div>
              </div>
            ))}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onResolve('edit')}
            className="cursor-pointer"
          >
            Quay lại chỉnh sửa câu hỏi
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onResolve('force')}
            className="cursor-pointer font-bold"
          >
            Vẫn giữ đáp án trong đề thi này
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
