'use client'

import React from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/ui/dialog'
import { Input } from '@/components/shared/ui/input'
import { Textarea } from '@/components/shared/ui/textarea'
import { Button } from '@/components/shared/ui/button'
import { Loader2 } from 'lucide-react'

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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-xl rounded-[32px] p-6 sm:p-8 border border-white/80 bg-white/95 backdrop-blur-2xl shadow-2xl z-50">
        <DialogTitle className="text-2xl font-black text-slate-800 mb-4">Tạo bài đăng mới</DialogTitle>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="post-title" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Tiêu đề câu hỏi / Chủ đề
            </label>
            <Input
              id="post-title"
              placeholder="Nhập tiêu đề rõ ràng..."
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              maxLength={150}
              className="h-12 rounded-xl border-2 border-slate-200 focus-visible:ring-1 focus-visible:ring-[#5D7B6F] focus-visible:ring-offset-0 focus-visible:border-[#5D7B6F] focus:border-[#5D7B6F] font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="post-content" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Nội dung chi tiết
            </label>
            <Textarea
              id="post-content"
              placeholder="Mô tả chi tiết thắc mắc hoặc nội dung bạn muốn chia sẻ..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="min-h-[130px] rounded-xl border-2 border-slate-200 focus-visible:ring-1 focus-visible:ring-[#5D7B6F] focus-visible:ring-offset-0 focus-visible:border-[#5D7B6F] focus:border-[#5D7B6F] font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="post-tags" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Tags (cách nhau bởi dấu phẩy)
            </label>
            <Input
              id="post-tags"
              placeholder="VD: Toán rời rạc, Tiếng Anh B1, Flashcards"
              value={postTags}
              onChange={(e) => setPostTags(e.target.value)}
              className="h-12 rounded-xl border-2 border-slate-200 focus-visible:ring-1 focus-visible:ring-[#5D7B6F] focus-visible:ring-offset-0 focus-visible:border-[#5D7B6F] focus:border-[#5D7B6F] font-medium"
            />
          </div>

          <Button
            onClick={() => createPostMutation.mutate()}
            disabled={createPostMutation.isPending || !postTitle.trim() || !postContent.trim()}
            className="w-full h-12 mt-4 bg-[#5D7B6F] hover:bg-[#4A6359] text-white rounded-xl font-black text-sm"
          >
            {createPostMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đăng bài ngay'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
