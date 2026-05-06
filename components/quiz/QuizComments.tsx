'use client'

import React, { useState } from 'react'
import { MessageSquare, Send, Trash2, Loader2, Info } from 'lucide-react'
import { UnauthorizedView } from '@/components/shared/UnauthorizedView'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface QuizComment {
  _id: string
  user_id: {
    username: string
    avatar_url: string | null
    avatarUrl?: string | null
    name?: string
    _id?: string
  }
  content: string
  created_at: string
}

interface QuizCommentsProps {
  quizId: string
  comments: QuizComment[]
  isLoading: boolean
  currentUser: any
  onPostComment: (content: string) => void
  onDeleteComment: (commentId: string) => void
  isPosting: boolean
  isDeleting: boolean
  onAuthRequired: () => void
}

export function QuizComments({
  quizId,
  comments,
  isLoading,
  currentUser,
  onPostComment,
  onDeleteComment,
  isPosting,
  isDeleting,
  onAuthRequired
}: QuizCommentsProps) {
  const [commentContent, setCommentContent] = useState('')
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [showAuthHint, setShowAuthHint] = useState(false)

  const handlePost = () => {
    if (!commentContent.trim() && currentUser?._id) return
    if (!currentUser?._id) {
      setShowAuthHint(true)
      setTimeout(() => setShowAuthHint(false), 5000)
      return
    }
    onPostComment(commentContent)
    setCommentContent('')
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5D7B6F]/5 text-[#5D7B6F]">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.1em] text-gray-900">Thảo luận cộng đồng</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{comments.length} đóng góp</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all focus-within:shadow-md focus-within:border-[#5D7B6F]/30">
        <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
          <Avatar className="h-8 w-8 border border-gray-100 shadow-sm">
            {(currentUser?.avatarUrl || currentUser?.avatar_url) && (
              <AvatarImage src={currentUser.avatarUrl || currentUser.avatar_url} />
            )}
            <AvatarFallback className="bg-gray-100 text-gray-400 text-[10px] font-black uppercase">
              {currentUser?._id ? (currentUser?.username || currentUser?.name || '??').substring(0, 2) : '?'}
            </AvatarFallback>
          </Avatar>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#5D7B6F]">
            {currentUser?._id ? 'Viết bình luận của bạn' : 'Đăng nhập để tham gia thảo luận'}
          </p>
        </div>
        
        <div className="space-y-4">
          <div className={`overflow-hidden transition-all duration-300 ${showAuthHint ? 'max-h-20 opacity-100 mb-2' : 'max-h-0 opacity-0'}`}>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-wider">Vui lòng đăng nhập để gửi bình luận</p>
              </div>
              <Link href={`/login?redirect=/quiz/${quizId}`}>
                <Button variant="ghost" className="h-7 px-3 text-[9px] font-black uppercase text-amber-700 hover:bg-amber-100">
                  Đăng nhập
                </Button>
              </Link>
            </div>
          </div>

          <Textarea 
            placeholder={currentUser?._id ? "Chia sẻ suy nghĩ hoặc thắc mắc của bạn về bộ đề này..." : "Bạn cần đăng nhập để gửi bình luận..."}
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            className="min-h-[80px] w-full resize-none border-none bg-transparent p-0 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 focus-visible:ring-0 focus:outline-none"
          />
          
          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Tối đa 1000 ký tự</p>
            <Button 
              onClick={handlePost}
              disabled={isPosting || (currentUser?._id && !commentContent.trim())}
              className="bg-[#5D7B6F] h-9 px-5 text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-[#5D7B6F]/10 hover:bg-[#4a6358] hover:translate-y-[-1px] active:translate-y-0 transition-all"
            >
              {isPosting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  {currentUser?._id ? 'Gửi bình luận' : 'Đăng nhập để gửi'} <Send className="h-3 w-3" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-8 mt-2">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gray-200" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-200">
              <MessageSquare className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium text-gray-400 italic">Chưa có bình luận nào cho bộ đề này.</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mt-2">Hãy là người đầu tiên chia sẻ cảm nghĩ!</p>
          </div>
        ) : (
          comments.map((comment) => {
            const user = comment.user_id || { username: 'Người dùng đã xóa', name: 'Người dùng đã xóa', avatar_url: null, avatarUrl: null }
            const avatarUrl = user.avatar_url || user.avatarUrl
            
            return (
              <div key={comment._id} className="group flex gap-4 animate-in fade-in duration-500">
                <Avatar className="h-8 w-8 shrink-0 border-2 border-white shadow-sm ring-1 ring-gray-100">
                  {avatarUrl && <AvatarImage src={avatarUrl} />}
                  <AvatarFallback className="bg-[#A4C3A2] text-[#5D7B6F] text-[10px] font-black uppercase">
                    {(user.username || user.name || '??').substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-gray-900">{user.username || user.name || 'Thành viên'}</span>
                      <span className="h-1 w-1 rounded-full bg-gray-200" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: vi })}
                      </span>
                    </div>
                    {currentUser && comment.user_id && String(currentUser._id) === String((comment.user_id as any)._id) && (
                      <button 
                        onClick={() => {
                          setCommentToDelete(comment._id)
                          setIsDeleteDialogOpen(true)
                        }}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all p-1.5 rounded-lg"
                        title="Xóa bình luận"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="relative rounded-sm bg-gray-50/50 p-3.5 transition-colors group-hover:bg-gray-50">
                    <p className="text-[13px] leading-relaxed text-gray-600 whitespace-pre-wrap">{comment.content}</p>
                    <div className="absolute -left-1 top-3 h-2.5 w-2.5 rotate-45 bg-gray-50/50 group-hover:bg-gray-50" />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase">Xóa bình luận</DialogTitle>
            <DialogDescription className="text-sm font-medium text-gray-500">
              Bạn có chắc chắn muốn xóa bình luận này không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="rounded-xl font-bold">
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (commentToDelete) onDeleteComment(commentToDelete)
                setIsDeleteDialogOpen(false)
              }} 
              disabled={isDeleting}
              className="rounded-xl font-black uppercase tracking-wider"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xóa vĩnh viễn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
