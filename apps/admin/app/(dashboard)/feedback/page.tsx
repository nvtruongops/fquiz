'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import { useAdminFeedback } from '@/hooks/feedback/useAdminFeedback'
import { FeedbackList } from '@/components/feedback/FeedbackList'
import { FeedbackReplyDialog } from '@/components/feedback/FeedbackReplyDialog'
import { FeedbackDeleteDialog } from '@/components/feedback/FeedbackDeleteDialog'
import { useTranslations } from '@fquiz/ui/i18n'

export default function AdminFeedbackPage() {
  const t = useTranslations()
  const {
    type,
    setType,
    status,
    setStatus,
    search,
    setSearch,
    replyTarget,
    setReplyTarget,
    replyText,
    setReplyText,
    deleteTarget,
    setDeleteTarget,
    feedbacks,
    isLoading,
    updateStatusMutation,
    replyMutation,
    deleteMutation,
  } = useAdminFeedback()

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('admin.feedbackTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('admin.feedbackDescription')}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder={t('admin.searchFeedback')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue placeholder={t('admin.allFeedbackTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allTypes')}</SelectItem>
            <SelectItem value="bug">{t('admin.bugReport')}</SelectItem>
            <SelectItem value="feature">{t('admin.featureRequest')}</SelectItem>
            <SelectItem value="content">{t('admin.contentFeedback')}</SelectItem>
            <SelectItem value="other">{t('admin.other')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder={t('admin.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
            <SelectItem value="pending">{t('admin.pending')}</SelectItem>
            <SelectItem value="reviewed">{t('admin.reviewed')}</SelectItem>
            <SelectItem value="resolved">{t('admin.resolved')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feedback List */}
      <FeedbackList
        isLoading={isLoading}
        feedbacks={feedbacks}
        onUpdateStatus={(id, st) => updateStatusMutation.mutate({ id, status: st })}
        onReplyTarget={(fb) => {
          setReplyTarget(fb)
          setReplyText(fb.reply_message || '')
        }}
        onDeleteTarget={setDeleteTarget}
      />

      {/* Reply Dialog */}
      <FeedbackReplyDialog
        replyTarget={replyTarget}
        replyText={replyText}
        onChangeReplyText={setReplyText}
        isPending={replyMutation.isPending}
        onClose={() => setReplyTarget(null)}
        onSubmitReply={() =>
          replyTarget &&
          replyMutation.mutate({ id: replyTarget._id, reply_message: replyText.trim() })
        }
      />

      {/* Delete Dialog */}
      <FeedbackDeleteDialog
        deleteTarget={deleteTarget}
        isPending={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
      />
    </div>
  )
}
