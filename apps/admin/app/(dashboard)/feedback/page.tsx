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

export default function AdminFeedbackPage() {
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
        <h1 className="text-2xl font-bold text-foreground">Hộp thư Góp ý &amp; Báo lỗi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tiếp nhận và phản hồi các ý kiến đóng góp, báo lỗi từ học viên
        </p>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Tìm theo nội dung, người gửi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue placeholder="Tất cả loại góp ý" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="bug">Báo lỗi</SelectItem>
            <SelectItem value="feature">Đề xuất tính năng</SelectItem>
            <SelectItem value="content">Góp ý nội dung</SelectItem>
            <SelectItem value="other">Khác</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Chờ xem (Pending)</SelectItem>
            <SelectItem value="reviewed">Đã xem (Reviewed)</SelectItem>
            <SelectItem value="resolved">Đã xử lý (Resolved)</SelectItem>
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
