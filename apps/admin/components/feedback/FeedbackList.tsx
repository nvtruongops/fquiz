'use client'

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
import { TYPE_COLORS, type Feedback } from '@/hooks/feedback/useAdminFeedback'
import { useLocale, useTranslations } from '@fquiz/ui/i18n'

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
  const t = useTranslations()
  const { locale } = useLocale()
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            {t('admin.noFeedback')}
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
                      {fb.type === 'bug' ? t('admin.bugReport') : fb.type === 'feature' ? t('admin.featureRequest') : fb.type === 'content' ? t('admin.contentFeedback') : t('admin.other')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={fb.status}
                      onValueChange={(status) => onUpdateStatus(fb._id, status)}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs font-semibold" aria-label={t('admin.changeFeedbackStatus', { username: fb.username })}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{t('admin.pending')}</SelectItem>
                        <SelectItem value="reviewed">{t('admin.reviewed')}</SelectItem>
                        <SelectItem value="resolved">{t('admin.resolved')}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReplyTarget(fb)}
                      className="h-7 px-2 text-muted-foreground hover:text-primary cursor-pointer"
                      title={t('admin.reply')}
                      aria-label={t('admin.replyTo', { username: fb.username })}
                    >
                      <Reply className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteTarget(fb)}
                      className="h-7 px-2 text-muted-foreground hover:text-destructive cursor-pointer"
                      title={t('admin.deletePermanently')}
                      aria-label={t('admin.deleteFeedbackFrom', { username: fb.username })}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-foreground/90 whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border border-border">
                  {fb.message}
                </p>

                {fb.reply_message && (
                  <div className="ml-4 p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                    <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                      {t('admin.adminReply')}
                    </div>
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap">{fb.reply_message}</p>
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground">
                  {t('admin.submitted', { date: new Date(fb.created_at).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US') })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
