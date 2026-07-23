'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Heart, MessageSquare, Clock, Trash2, ChevronDown, ChevronUp, Eye, Loader2
} from 'lucide-react'
import { Input } from '@/components/shared/ui/input'
import { Button } from '@/components/shared/ui/button'
import { cn } from '@/lib/core/utils/cn'

interface CommunityPostCardProps {
  post: any
  userId?: string
  authRole?: string
  expandedPostId: string | null
  setExpandedPostId: (id: string | null) => void
  confirmingDeletePostId: string | null
  setConfirmingDeletePostId: (id: string | null) => void
  deletePostMutation: any
  deleteCommentMutation: any
  recordViewMutation: any
  toggleLikeMutation: any
  createCommentMutation: any
  commentContent: string
  setCommentContent: (content: string) => void
  isAuthLoading: boolean
}

export const CommunityPostCard = React.memo(function CommunityPostCard({
  post,
  userId,
  authRole,
  expandedPostId,
  setExpandedPostId,
  confirmingDeletePostId,
  setConfirmingDeletePostId,
  deletePostMutation,
  deleteCommentMutation,
  recordViewMutation,
  toggleLikeMutation,
  createCommentMutation,
  commentContent,
  setCommentContent,
  isAuthLoading,
}: CommunityPostCardProps) {
  const isLiked = post.likes?.includes(userId)
  const isExpanded = expandedPostId === post._id

  const handleCardClick = () => {
    const nextState = isExpanded ? null : post._id
    setExpandedPostId(nextState)
    if (nextState && userId && String(post.authorId) !== String(userId)) {
      const currentViews = post.views || []
      if (!currentViews.includes(userId)) {
        recordViewMutation.mutate(post._id)
      }
    }
  }

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick()
        }
      }}
      className="relative bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl pt-[20px] pb-[18px] px-[25px] shadow-xs hover:shadow-md transition-all cursor-pointer group hover:-translate-y-0.5 space-y-3"
    >
      {userId && (String(post.authorId) === String(userId) || authRole === 'admin') && (
        <div className="absolute top-[16px] right-[20px] z-10 flex items-center">
          <AnimatePresence>
            {confirmingDeletePostId === post._id ? (
              <motion.div
                initial={{ opacity: 0, width: 0, marginRight: 0 }}
                animate={{ opacity: 1, width: 'auto', marginRight: 8 }}
                exit={{ opacity: 0, width: 0, marginRight: 0 }}
                className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deletePostMutation.mutate(post._id)
                    setConfirmingDeletePostId(null)
                  }}
                  disabled={deletePostMutation.isPending}
                  className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold rounded-lg transition-colors shrink-0"
                >
                  {deletePostMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Xóa bài'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmingDeletePostId(null)
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg transition-colors shrink-0"
                >
                  Hủy
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setConfirmingDeletePostId(post._id)
            }}
            title="Xóa bài đăng"
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap pr-10">
          {post.tags.map((tag: string) => (
            <span key={tag} className="px-2.5 py-0.5 bg-[#5D7B6F]/10 text-[#5D7B6F] text-[10px] font-black uppercase tracking-wider rounded-lg border border-[#5D7B6F]/20">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <h3 className="text-base sm:text-lg font-black text-slate-800 group-hover:text-[#5D7B6F] transition-colors leading-snug pr-10">
        {post.title}
      </h3>

      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#5D7B6F] to-[#455A52] flex items-center justify-center text-white font-bold text-xs shadow-xs">
            {post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">{post.authorName}</p>
            <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (!userId) {
                window.location.href = '/login'
                return
              }
              toggleLikeMutation.mutate(post._id)
            }}
            title={userId ? (isLiked ? 'Bỏ thích' : 'Thích') : 'Đăng nhập để thích'}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-xl transition-all cursor-pointer text-xs font-bold",
              isLiked ? "text-red-500 bg-red-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
            <span>{post.likes?.length || 0}</span>
          </button>

          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold px-2 py-1">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <span>{post.comments?.length || 0}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold px-2 py-1" title="Lượt xem">
            <Eye className="w-4 h-4 text-slate-400" />
            <span>{post.views?.length || 0}</span>
          </div>

          <div className="text-slate-400 p-1">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <PostExpandedDetails
            post={post}
            userId={userId}
            authRole={authRole}
            isAuthLoading={isAuthLoading}
            commentContent={commentContent}
            setCommentContent={setCommentContent}
            createCommentMutation={createCommentMutation}
            deleteCommentMutation={deleteCommentMutation}
          />
        )}
      </AnimatePresence>
    </div>
  )
})

function PostExpandedDetails({
  post,
  userId,
  authRole,
  isAuthLoading,
  commentContent,
  setCommentContent,
  createCommentMutation,
  deleteCommentMutation,
}: any) {
  const [confirmingDeleteCommentId, setConfirmingDeleteCommentId] = useState<string | null>(null)

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 pb-2 px-1.5">
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
          {post.content}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Bình luận ({post.comments?.length || 0})
          </h4>

          {post.comments?.length === 0 ? (
            <p className="text-slate-400 font-medium text-center py-4 text-xs bg-slate-50/50 rounded-2xl">
              Chưa có bình luận nào. Hãy gửi bình luận đầu tiên!
            </p>
          ) : (
            <div className="space-y-2.5">
              {post.comments?.map((comment: any) => (
                <div key={comment._id} className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#5D7B6F] to-[#455A52] flex items-center justify-center text-white font-bold text-[10px]">
                        {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <span className="text-xs font-bold text-slate-700">{comment.authorName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}
                      </span>
                      {userId && (String(comment.authorId) === String(userId) || authRole === 'admin') && (
                        <div className="relative flex items-center shrink-0">
                          <AnimatePresence>
                            {confirmingDeleteCommentId === comment._id ? (
                              <motion.div
                                initial={{ opacity: 0, width: 0, marginRight: 0 }}
                                animate={{ opacity: 1, width: 'auto', marginRight: 4 }}
                                exit={{ opacity: 0, width: 0, marginRight: 0 }}
                                className="flex items-center gap-1 overflow-hidden whitespace-nowrap"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteCommentMutation.mutate({ postId: post._id, commentId: comment._id })
                                    setConfirmingDeleteCommentId(null)
                                  }}
                                  disabled={deleteCommentMutation.isPending}
                                  className="px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded-md transition-colors shrink-0"
                                >
                                  {deleteCommentMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : 'Xóa'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setConfirmingDeleteCommentId(null)
                                  }}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-md transition-colors shrink-0"
                                >
                                  Hủy
                                </button>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmingDeleteCommentId(confirmingDeleteCommentId === comment._id ? null : comment._id)
                            }}
                            title="Xóa bình luận"
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-700 whitespace-pre-wrap pl-8">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2">
          {isAuthLoading ? (
            <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
          ) : userId ? (
            <div className="flex items-center gap-2">
              <Input
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && commentContent.trim()) {
                    e.preventDefault()
                    e.stopPropagation()
                    createCommentMutation.mutate({ postId: post._id, content: commentContent })
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Viết bình luận... (Nhấn Enter để gửi)"
                className="h-10 text-xs font-medium rounded-xl border border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#5D7B6F] focus-visible:ring-offset-0 focus-visible:border-[#5D7B6F] focus:border-[#5D7B6F]"
              />
              <Button
                type="button"
                disabled={!commentContent.trim() || createCommentMutation.isPending}
                onClick={(e) => {
                  e.stopPropagation()
                  if (commentContent.trim()) {
                    createCommentMutation.mutate({ postId: post._id, content: commentContent })
                  }
                }}
                className="h-10 bg-[#5D7B6F] hover:bg-[#4A6359] text-white rounded-xl text-xs font-bold px-4 shrink-0"
              >
                {createCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gửi'}
              </Button>
            </div>
          ) : (
            <a
              href="/login"
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-bold text-[#5D7B6F] hover:underline block text-center py-2"
            >
              Đăng nhập để tham gia bình luận
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}
