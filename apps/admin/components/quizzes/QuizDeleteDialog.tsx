import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { Quiz } from '@/hooks/quizzes/useAdminQuizzes'

interface QuizDeleteDialogProps {
  deleteTarget: Quiz | null
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function QuizDeleteDialog({
  deleteTarget,
  isPending,
  onClose,
  onConfirm,
}: QuizDeleteDialogProps) {
  return (
    <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa đề thi</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn xóa đề thi{' '}
            <span className="font-bold text-foreground">{deleteTarget?.title}</span>? Thao tác này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Xác nhận xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
