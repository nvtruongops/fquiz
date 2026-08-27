import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { Category } from '@/hooks/categories/useAdminCategories'

interface CategoryDeleteDialogProps {
  deleteTarget: Category | null
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function CategoryDeleteDialog({
  deleteTarget,
  isPending,
  onClose,
  onConfirm,
}: CategoryDeleteDialogProps) {
  return (
    <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa danh mục môn thi</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn xóa danh mục{' '}
            <span className="font-bold text-foreground">{deleteTarget?.name}</span>? Thao tác này không thể hoàn tác.
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
