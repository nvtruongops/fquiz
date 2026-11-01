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
import type { Feedback } from '@/hooks/feedback/useAdminFeedback'
import { useTranslations } from '@fquiz/ui/i18n'

interface FeedbackDeleteDialogProps {
  deleteTarget: Feedback | null
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function FeedbackDeleteDialog({
  deleteTarget,
  isPending,
  onClose,
  onConfirm,
}: FeedbackDeleteDialogProps) {
  const t = useTranslations()
  return (
    <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.deleteFeedbackTitle')}</DialogTitle>
          <DialogDescription>
            {t('admin.confirmDeleteFeedback')}
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
            {t('admin.confirmDelete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
