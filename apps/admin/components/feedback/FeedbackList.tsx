import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Reply, Loader2, MessageSquare } from 'lucide-react'
import { TYPE_LABELS, TYPE_COLORS, type Feedback } from '@/hooks/feedback/useAdminFeedback'

interface FeedbackListProps {
  isLoading: boolean
  feedbacks: Feedback[]
  onUpdateStatus: (id: string, status: string) => void
  onReplyTarget: (fb: Feedback) => void
  onDeleteTarget: (fb: Feedback) => void
}

export function FeedbackList({
  isLoading,
  feedbacks,
  onUpdateStatus,
  onReplyTarget,
  onDeleteTarget,
}: FeedbackListProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Không có góp ý nào phù hợp
          </div>
        ) : (
          <div className="divide-y divide-border">
            {feedbacks.map((fb) => (
              <div key={fb._id} className="p-5 hover:bg-muted/30 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-foreground text-sm">{fb.username}</span>
                    <span className="text-xs text-muted-foreground">({fb.user_email})</span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        TYPE_COLORS[fb.type] || TYPE_COLORS.other
                      }`}
                    >
                      {TYPE_LABELS[fb.type] || fb.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={fb.status}
                      onValueChange={(status) => onUpdateStatus(fb._id, status)}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Chờ xem</SelectItem>
                        <SelectItem value="reviewed">Đã xem</SelectItem>
                        <SelectItem value="resolved">Đã xử lý</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReplyTarget(fb)}
                      className="h-7 px-2 text-muted-foreground hover:text-primary"
                      title="Phản hồi"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteTarget(fb)}
                      className="h-7 px-2 text-muted-foreground hover:text-destructive"
                      title="Xóa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-foreground/90 whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border border-border">
                  {fb.message}
                </p>

                {fb.reply_message && (
                  <div className="ml-4 p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                    <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Phản hồi từ Admin:
                    </div>
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap">{fb.reply_message}</p>
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground">
                  Gửi lúc: {new Date(fb.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
