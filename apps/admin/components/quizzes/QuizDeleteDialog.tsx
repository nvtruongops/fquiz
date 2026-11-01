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
import { useTranslations } from '@fquiz/ui/i18n'

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
  const t = useTranslations()
  return (
    <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.deleteQuizTitle')}</DialogTitle>
          <DialogDescription>
            {t('admin.confirmDeleteQuiz', { title: deleteTarget?.title ?? '' })}
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
