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
  return (
    <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Feedback</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this feedback? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
