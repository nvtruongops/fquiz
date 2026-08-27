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
import { useAuthPrompt } from '@/store/shared/auth-prompt-store'

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
  const isLiked = userId ? post.likes?.includes(userId) : false
  const isExpanded = expandedPostId === post._id
  const { openAuthPrompt } = useAuthPrompt()

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
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={handleCardClick}
      className={cn(
        "group relative bg-card backdrop-blur-xl border border-border hover:border-primary/40 rounded-3xl p-5 md:p-6 transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer space-y-4",
        isExpanded ? "ring-2 ring-primary/20 border-primary/40 bg-card/95" : ""
      )}
    >
      {userId && (String(post.authorId) === String(userId) || authRole === 'admin') && (
        <div className="absolute top-5 right-5 z-10 flex items-center">
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
                  className="px-2.5 py-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-[11px] font-bold rounded-lg transition-colors shrink-0"
                >
                  {deletePostMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Xóa bài'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmingDeletePostId(null)
                  }}
                  className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-muted-foreground text-[11px] font-bold rounded-lg transition-colors shrink-0"
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
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap pr-10">
          {post.tags.map((tag: string) => (
            <span key={tag} className="px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider rounded-lg border border-primary/20">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <h3 className="text-base sm:text-lg font-black text-card-foreground group-hover:text-primary transition-colors leading-snug pr-10">
        {post.title}
      </h3>

      <div className="flex items-center justify-between pt-2.5 border-t border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs">
            {post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">{post.authorName}</p>
            <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3 text-muted-foreground" /> {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (!userId) {
                openAuthPrompt({
                  featureName: 'Thích bài viết',
                  title: 'Đăng nhập để thích bài viết',
                  description: 'Vui lòng đăng nhập hoặc tạo tài khoản để bày tỏ cảm xúc và tương tác cùng cộng đồng FQuiz.',
                  targetUrl: '/community',
                })
                return
              }
              toggleLikeMutation.mutate(post._id)
            }}
            title={userId ? (isLiked ? 'Bỏ thích' : 'Thích') : 'Đăng nhập để thích'}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-xl transition-all cursor-pointer text-xs font-bold",
              isLiked ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
            <span>{post.likes?.length || 0}</span>
          </button>

          <div className="flex items-center gap-1 text-muted-foreground text-xs font-bold px-2 py-1">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span>{post.comments?.length || 0}</span>
          </div>

          <div className="flex items-center gap-1 text-muted-foreground text-xs font-bold px-2 py-1" title="Lượt xem">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span>{post.views?.length || 0}</span>
          </div>

          <div className="text-muted-foreground p-1">
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
    </motion.div>
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
  const { openAuthPrompt } = useAuthPrompt()

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mt-4 pt-4 border-t border-border space-y-4 pb-2 px-1.5">
        <div className="bg-muted/80 p-4 rounded-2xl border border-border text-xs sm:text-sm text-foreground font-medium leading-relaxed whitespace-pre-wrap">
          {post.content}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
            Bình luận ({post.comments?.length || 0})
          </h4>

          {post.comments?.length === 0 ? (
            <p className="text-muted-foreground font-medium text-center py-4 text-xs bg-muted/50 rounded-2xl">
              Chưa có bình luận nào. Hãy gửi bình luận đầu tiên!
            </p>
          ) : (
            <div className="space-y-2.5">
              {post.comments?.map((comment: any) => (
                <div key={comment._id} className="bg-muted/90 rounded-2xl p-3.5 border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-[10px]">
                        {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <span className="text-xs font-bold text-card-foreground">{comment.authorName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-medium">
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
                                  className="px-2 py-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-md transition-colors shrink-0"
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
                                  className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold rounded-md transition-colors shrink-0"
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
                            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-medium text-card-foreground whitespace-pre-wrap pl-8">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2">
          {isAuthLoading ? (
            <div className="h-10 bg-muted rounded-xl animate-pulse" />
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
                className="h-10 text-xs font-medium rounded-xl border border-border bg-card text-card-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary focus:border-primary placeholder:text-muted-foreground"
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
                className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold px-4 shrink-0 cursor-pointer"
              >
                {createCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gửi'}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                openAuthPrompt({
                  featureName: 'Bình luận thảo luận',
                  title: 'Đăng nhập để bình luận',
                  description: 'Vui lòng đăng nhập hoặc tạo tài khoản để tham gia chia sẻ ý kiến và giải đáp thắc mắc cùng cộng đồng FQuiz.',
                  targetUrl: '/community',
                })
              }}
              className="w-full text-xs font-bold text-primary hover:text-primary/90 block text-center py-2.5 bg-primary/5 hover:bg-primary/10 rounded-xl border border-primary/20 transition-all cursor-pointer"
            >
              Đăng nhập để tham gia bình luận
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
