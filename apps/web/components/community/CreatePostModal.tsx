'use client'

import React from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/ui/dialog'
import { Input } from '@/components/shared/ui/input'
import { Textarea } from '@/components/shared/ui/textarea'
import { Button } from '@/components/shared/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  postTitle: string
  setPostTitle: (val: string) => void
  postContent: string
  setPostContent: (val: string) => void
  postTags: string
  setPostTags: (val: string) => void
  createPostMutation: any
}

export default function CreatePostModal({
  isOpen,
  onClose,
  postTitle,
  setPostTitle,
  postContent,
  setPostContent,
  postTags,
  setPostTags,
  createPostMutation,
}: CreatePostModalProps) {
  const isTitleValid = postTitle.trim().length > 0 && postTitle.length <= 150
  const isContentValid = postContent.trim().length > 0 && postContent.length <= 10000

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-xl rounded-[32px] p-6 sm:p-8 border border-border bg-card/95 backdrop-blur-2xl shadow-2xl z-50 text-card-foreground">
        <DialogTitle className="text-2xl font-black text-foreground mb-2">Tạo bài đăng mới</DialogTitle>

        {createPostMutation.isError && (
          <div className="bg-incorrect-bg border border-incorrect-border rounded-xl p-3.5 flex items-start gap-2.5 text-destructive text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-destructive mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Đăng bài không thành công:</span>{' '}
              {createPostMutation.error?.message || 'Có lỗi xảy ra, vui lòng thử lại.'}
            </div>
          </div>
        )}

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="post-title" className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Tiêu đề câu hỏi / Chủ đề
              </label>
              <span className="text-[10px] font-bold text-muted-foreground">
                {postTitle.length}/150
              </span>
            </div>
            <Input
              id="post-title"
              placeholder="Nhập tiêu đề rõ ràng..."
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              maxLength={150}
              className="h-12 rounded-xl border-2 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary focus:border-primary font-medium bg-card text-card-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="post-content" className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Nội dung chi tiết
              </label>
              <span className="text-[10px] font-bold text-muted-foreground">
                {postContent.length}/10000
              </span>
            </div>
            <Textarea
              id="post-content"
              placeholder="Mô tả chi tiết thắc mắc hoặc nội dung bạn muốn chia sẻ..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              maxLength={10000}
              className="min-h-[130px] rounded-xl border-2 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary focus:border-primary font-medium bg-card text-card-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="post-tags" className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">
              Tags (cách nhau bởi dấu phẩy)
            </label>
            <Input
              id="post-tags"
              placeholder="Nhập các thẻ tag liên quan (cách nhau bởi dấu phẩy)..."
              value={postTags}
              onChange={(e) => setPostTags(e.target.value)}
              className="h-12 rounded-xl border-2 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary focus:border-primary font-medium bg-card text-card-foreground"
            />
          </div>

          <Button
            onClick={() => createPostMutation.mutate()}
            disabled={createPostMutation.isPending || !isTitleValid || !isContentValid}
            className="w-full h-12 mt-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-black text-sm transition-all shadow-md cursor-pointer"
          >
            {createPostMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Đăng bài ngay'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
