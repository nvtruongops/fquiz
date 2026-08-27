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

interface FeedbackReplyDialogProps {
  replyTarget: Feedback | null
  replyText: string
  onChangeReplyText: (val: string) => void
  isPending: boolean
  onClose: () => void
  onSubmitReply: () => void
}

export function FeedbackReplyDialog({
  replyTarget,
  replyText,
  onChangeReplyText,
  isPending,
  onClose,
  onSubmitReply,
}: FeedbackReplyDialogProps) {
  return (
    <Dialog open={!!replyTarget} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Phản hồi góp ý của {replyTarget?.username}</DialogTitle>
          <DialogDescription className="text-xs">
            Nội dung phản hồi sẽ được lưu và hiển thị cho học viên
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground max-h-32 overflow-y-auto">
            {replyTarget?.message}
          </div>

          <textarea
            rows={4}
            required
            placeholder="Nhập nội dung phản hồi..."
            value={replyText}
            onChange={(e) => onChangeReplyText(e.target.value)}
            className="w-full resize-none border p-3 text-sm rounded-lg outline-none border-border focus:border-primary bg-background"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            disabled={isPending || !replyText.trim()}
            onClick={onSubmitReply}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Gửi phản hồi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
