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
import { useTranslations } from '@fquiz/ui/i18n'

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
  const t = useTranslations()
  return (
    <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.deleteCategoryTitle')}</DialogTitle>
          <DialogDescription>
            {t('admin.confirmDeleteCategory', { name: deleteTarget?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t('admin.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
