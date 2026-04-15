'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { withCsrfHeaders } from '@/lib/csrf'
import { formatDistanceToNow, subDays, isAfter } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Feedback {
  _id: string
  username: string
  user_email: string
  type: 'bug' | 'feature' | 'content' | 'other'
  message: string
  status: 'pending' | 'reviewed' | 'resolved'
  reply_message?: string
  replied_at?: string
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  bug: 'Báo lỗi', feature: 'Đề xuất tính năng', content: 'Góp ý nội dung', other: 'Khác',
}
const TYPE_COLORS: Record<string, string> = {
  bug: 'bg-red-50 text-red-700 border-red-200',
  feature: 'bg-blue-50 text-blue-700 border-blue-200',
  content: 'bg-purple-50 text-purple-700 border-purple-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700 border-orange-200',
  reviewed: 'bg-blue-100 text-blue-700 border-blue-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xem', reviewed: 'Đã xem', resolved: 'Đã phản hồi',
}

const TIME_OPTIONS = [
  { value: 'all', label: 'Tất cả thời gian' },
  { value: '1', label: 'Hôm nay' },
  { value: '7', label: '7 ngày qua' },
  { value: '30', label: '30 ngày qua' },
  { value: '90', label: '90 ngày qua' },
]

function FeedbackRow({ fb, onStatusChange, onDelete, onReply, isUpdating, isDeleting, isReplying }: {
  fb: Feedback
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  onReply: (id: string, msg: string) => void
  isUpdating: boolean
  isDeleting: boolean
  isReplying: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyMsg, setReplyMsg] = useState('')

  return (
    <div className={cn(
      'rounded-lg border-2 bg-white transition-all hover:shadow-md',
      fb.status === 'pending' 
        ? 'border-l-4 border-l-orange-500 border-t-2 border-r-2 border-b-2 border-gray-800 bg-orange-50/30' 
        : 'border-gray-800 hover:border-gray-900'
    )}>
      {/* Header row — thanh thông tin chính */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 shrink-0 transition-colors underline"
        >
          {expanded ? 'Thu gọn' : 'Xem'}
        </button>

        {/* Info chính */}
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span className="font-bold text-gray-900 text-sm">@{fb.username}</span>
          <span className="text-xs text-gray-400">•</span>
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded border', TYPE_COLORS[fb.type])}>
            {TYPE_LABELS[fb.type]}
          </span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-600 font-medium">
            {formatDistanceToNow(new Date(fb.created_at), { addSuffix: true, locale: vi })}
          </span>
        </div>

        {/* Badge trạng thái */}
        <div className={cn('text-xs font-semibold px-2.5 py-1 rounded border', STATUS_COLORS[fb.status])}>
          {STATUS_LABELS[fb.status]}
        </div>

        {/* 3 action buttons với text */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Đã xem */}
          <button
            onClick={() => onStatusChange(fb._id, 'reviewed')}
            disabled={isUpdating || fb.status === 'reviewed' || fb.status === 'resolved'}
            className={cn(
              'text-xs font-semibold px-3 py-1.5 rounded-lg border-2 transition-all',
              fb.status === 'reviewed' || fb.status === 'resolved'
                ? 'text-gray-400 border-gray-300 cursor-not-allowed bg-gray-50'
                : 'text-blue-600 border-gray-800 hover:bg-blue-50 hover:border-blue-600'
            )}
          >
            {isUpdating ? 'Đang xử lý...' : 'Đã xem'}
          </button>

          {/* Phản hồi - chỉ hiện khi chưa phản hồi */}
          {fb.status !== 'resolved' && (
            <button
              onClick={() => { setReplyOpen(v => !v); if (!expanded) setExpanded(true) }}
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-lg border-2 transition-all',
                replyOpen 
                  ? 'bg-[#5D7B6F] text-white border-[#5D7B6F]' 
                  : 'text-[#5D7B6F] border-gray-800 hover:bg-[#5D7B6F]/5 hover:border-[#5D7B6F]'
              )}
            >
              Phản hồi
            </button>
          )}

          {/* Xóa */}
          <button
            onClick={() => onDelete(fb._id)}
            disabled={isDeleting}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border-2 border-gray-800 text-red-600 hover:bg-red-50 hover:border-red-600 transition-all disabled:opacity-50"
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t-2 border-gray-800 pt-3">
          {/* Nội dung góp ý */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">NỘI DUNG GÓP Ý</p>
            <div className="text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-lg p-3 border-2 border-gray-800 whitespace-pre-wrap break-words">
              {fb.type === 'other' && fb.message.includes('\n\n') ? (
                // Nếu là loại "Khác" và có format lý do + nội dung
                (() => {
                  const parts = fb.message.split('\n\n')
                  return (
                    <>
                      <div className="mb-3">
                        <span className="font-bold text-gray-700">Lý do:</span>
                        <div className="mt-1 pl-3 border-l-2 border-gray-400">{parts[0]}</div>
                      </div>
                      {parts[1] && (
                        <div>
                          <span className="font-bold text-gray-700">Nội dung:</span>
                          <div className="mt-1 pl-3 border-l-2 border-gray-400">{parts[1]}</div>
                        </div>
                      )}
                    </>
                  )
                })()
              ) : (
                fb.message
              )}
            </div>
          </div>

          {/* Hiển thị nội dung đã phản hồi nếu có */}
          {fb.status === 'resolved' && fb.reply_message && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#5D7B6F] uppercase tracking-wide">
                NỘI DUNG ĐÃ PHẢN HỒI
                {fb.replied_at && (
                  <span className="text-gray-400 font-medium normal-case ml-2">
                    • {formatDistanceToNow(new Date(fb.replied_at), { addSuffix: true, locale: vi })}
                  </span>
                )}
              </p>
              <div className="text-sm text-gray-800 leading-relaxed bg-[#5D7B6F]/5 rounded-lg p-3 border-2 border-[#5D7B6F] whitespace-pre-wrap break-words">
                {fb.reply_message}
              </div>
            </div>
          )}

          {/* Reply form - chỉ hiện khi chưa phản hồi */}
          {replyOpen && fb.status !== 'resolved' && (
            <div className="space-y-3 bg-[#5D7B6F]/5 rounded-lg p-4 border-2 border-gray-800">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#5D7B6F]">
                  Phản hồi tới: {fb.user_email || fb.username}
                </p>
                <span className="text-[10px] text-gray-600 bg-white px-2 py-1 rounded border-2 border-gray-800 font-semibold">
                  Email tự động
                </span>
              </div>
              
              <Textarea
                value={replyMsg}
                onChange={(e) => setReplyMsg(e.target.value.slice(0, 2000))}
                placeholder="Nhập nội dung phản hồi..."
                className="min-h-[120px] rounded-lg border-2 border-gray-800 text-sm resize-none focus:border-[#5D7B6F] focus:ring-[#5D7B6F]"
              />
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 font-medium">
                  {replyMsg.length}/2000 ký tự
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setReplyOpen(false); setReplyMsg('') }}
                    className="rounded-lg text-xs h-8 font-semibold"
                  >
                    Hủy
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      onReply(fb._id, replyMsg)
                      setReplyOpen(false)
                      setReplyMsg('')
                    }}
                    disabled={isReplying || replyMsg.trim().length < 10}
                    className="rounded-lg bg-[#5D7B6F] hover:bg-[#4A6359] text-xs h-8 font-semibold"
                  >
                    {isReplying ? 'Đang gửi...' : 'Gửi phản hồi'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminFeedbackPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [filterExpanded, setFilterExpanded] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'feedback'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/feedback?limit=200`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/feedback/${id}`, {
        method: 'DELETE',
        headers: withCsrfHeaders(),
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to delete')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] }),
  })

  const replyMutation = useMutation({
    mutationFn: async ({ id, reply_message }: { id: string; reply_message: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/feedback/${id}`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ reply_message }),
      })
      if (!res.ok) throw new Error('Failed to reply')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] }),
  })

  const allFeedbacks: Feedback[] = data?.feedbacks ?? []

  // Client-side filtering
  const filtered = useMemo(() => {
    return allFeedbacks.filter(fb => {
      if (statusFilter !== 'all' && fb.status !== statusFilter) return false
      if (typeFilter !== 'all' && fb.type !== typeFilter) return false
      if (timeFilter !== 'all') {
        const days = parseInt(timeFilter)
        if (!isAfter(new Date(fb.created_at), subDays(new Date(), days))) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!fb.username.toLowerCase().includes(q) && !fb.message.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [allFeedbacks, statusFilter, typeFilter, timeFilter, search])

  const pendingCount = allFeedbacks.filter(f => f.status === 'pending').length
  const reviewedCount = allFeedbacks.filter(f => f.status === 'reviewed').length
  const resolvedCount = allFeedbacks.filter(f => f.status === 'resolved').length

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || timeFilter !== 'all' || search.trim() !== ''

  const feedbackToDelete = deleteConfirmId ? filtered.find(f => f._id === deleteConfirmId) : null

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quản lý góp ý</h1>
          <p className="text-sm text-gray-600 mt-1">Xem và phản hồi góp ý từ người dùng</p>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 text-orange-700 font-semibold px-4 py-2 rounded-lg text-sm">
              <span className="font-bold">{pendingCount}</span> chờ xem
            </div>
          )}
          {reviewedCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 font-semibold px-4 py-2 rounded-lg text-sm">
              <span className="font-bold">{reviewedCount}</span> đã xem
            </div>
          )}
          {resolvedCount > 0 && (
            <div className="bg-green-50 border border-green-200 text-green-700 font-semibold px-4 py-2 rounded-lg text-sm">
              <span className="font-bold">{resolvedCount}</span> đã phản hồi
            </div>
          )}
        </div>
      </div>

      {/* Bộ lọc 3 bậc - Thu gọn được */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Header bộ lọc - luôn hiển thị */}
        <button
          onClick={() => setFilterExpanded(v => !v)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-800">Bộ lọc</span>
            {hasActiveFilters && (
              <span className="text-xs bg-[#5D7B6F] text-white px-2 py-0.5 rounded-full font-semibold">
                Đang lọc
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {filterExpanded ? 'Thu gọn' : 'Mở rộng'}
          </span>
        </button>

        {/* Nội dung bộ lọc - chỉ hiện khi mở rộng */}
        {filterExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
            {/* Bậc 1: Lọc theo lý do (type) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">
                1. LỌC THEO LÝ DO
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full max-w-md rounded-lg h-9 font-medium text-sm border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="bug">Báo lỗi</SelectItem>
                  <SelectItem value="feature">Đề xuất tính năng</SelectItem>
                  <SelectItem value="content">Góp ý nội dung</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bậc 2: Lọc theo thời gian + trạng thái */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">
                  2. LỌC THEO THỜI GIAN
                </label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-full rounded-lg h-9 font-medium text-sm border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">
                  LỌC THEO TRẠNG THÁI
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full rounded-lg h-9 font-medium text-sm border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="pending">Chờ xem</SelectItem>
                    <SelectItem value="reviewed">Đã xem</SelectItem>
                    <SelectItem value="resolved">Đã phản hồi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bậc 3: Tìm kiếm */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block">
                3. TÌM KIẾM
              </label>
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo username hoặc nội dung góp ý..."
                  className="h-9 rounded-lg border-gray-200 text-sm font-medium pr-16"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 font-medium underline"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>

            {/* Reset filters */}
            {hasActiveFilters && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    setStatusFilter('all')
                    setTypeFilter('all')
                    setTimeFilter('all')
                    setSearch('')
                  }}
                  className="text-xs text-gray-600 hover:text-gray-900 font-semibold underline"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Danh sách */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="w-8 h-8 border-3 border-[#5D7B6F] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-gray-600 font-medium">Đang tải góp ý...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
            <span className="text-lg font-bold text-gray-400">0</span>
          </div>
          <p className="text-gray-800 font-semibold mb-1">Không có góp ý nào phù hợp</p>
          <p className="text-sm text-gray-500">Thử điều chỉnh bộ lọc hoặc tìm kiếm</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-gray-700 font-medium">
              Hiển thị <span className="font-bold text-gray-900">{filtered.length}</span> góp ý
            </p>
          </div>
          {filtered.map(fb => (
            <FeedbackRow
              key={fb._id}
              fb={fb}
              onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
              onDelete={(id) => setDeleteConfirmId(id)}
              onReply={(id, msg) => replyMutation.mutate({ id, reply_message: msg })}
              isUpdating={updateMutation.isPending && (updateMutation.variables as any)?.id === fb._id}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === fb._id}
              isReplying={replyMutation.isPending && (replyMutation.variables as any)?.id === fb._id}
            />
          ))}
        </div>
      )}

      {/* Dialog xác nhận xóa */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">Xác nhận xóa góp ý</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Bạn có chắc chắn muốn xóa góp ý từ <span className="font-bold text-gray-900">@{feedbackToDelete?.username}</span>?
              <br />
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirmId(null)}
              className="rounded-lg font-semibold"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteMutation.mutate(deleteConfirmId)
                  setDeleteConfirmId(null)
                }
              }}
              disabled={deleteMutation.isPending}
              className="rounded-lg font-semibold"
            >
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
