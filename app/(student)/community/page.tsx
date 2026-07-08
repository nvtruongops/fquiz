'use client'

import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles, Bug, Lightbulb, BookOpen, MessageCircle, Send, CheckCircle2,
  Loader2, Heart, MessageSquare, Clock, Plus, X, Search, Trash2,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Textarea } from '@/components/shared/ui/textarea'
import { Input } from '@/components/shared/ui/input'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/shared/ui/dialog'
import { cn } from '@/lib/core/utils/cn'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useAuth } from '@/hooks/auth/useAuth'

const FEEDBACK_TYPES = [
  { value: 'bug',     label: 'Báo lỗi',          icon: Bug },
  { value: 'feature', label: 'Đề xuất tính năng', icon: Lightbulb },
  { value: 'content', label: 'Góp ý nội dung',    icon: BookOpen },
  { value: 'other',   label: 'Khác',              icon: MessageCircle },
] as const

type FeedbackType = typeof FEEDBACK_TYPES[number]['value']

const RATE_LIMIT = 3
const RATE_WINDOW_MS = 60 * 60 * 1000

export default function CommunityPage() {
  const { data: authData, isLoading: isAuthLoading } = useAuth()
  const userId = authData?.user?._id
  const queryClient = useQueryClient()

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)

  // Feedback States
  const [type, setType] = useState<FeedbackType>('feature')
  const [message, setMessage] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [rateLimited, setRateLimited] = useState(false)
  const [cooldownSec, setCooldownSec] = useState(0)

  const submitTimestamps = useRef<number[]>([])
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const isOther = type === 'other'
  const finalMessage = isOther
    ? [reason.trim(), message.trim()].filter(Boolean).join('\n\n')
    : message.trim()

  const canSubmit = !loading && !rateLimited && 
    (isOther 
      ? (reason.trim().length >= 5 && message.trim().length >= 5)
      : (message.trim().length >= 5)
    )

  // Posts State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState('')
  const [postTags, setPostTags] = useState('')

  const [commentContent, setCommentContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const postsPerPage = 10
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)

  // Delete confirmation state (thay th? confirm() dialog)
  const [confirmingDeletePostId, setConfirmingDeletePostId] = useState<string | null>(null)
  const [confirmingDeleteCommentId, setConfirmingDeleteCommentId] = useState<string | null>(null)

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1) // Reset page on new search
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Queries
  const { data: postsData, isLoading: isLoadingPosts } = useQuery({
    queryKey: ['community', 'posts', debouncedSearch, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('page', String(currentPage))
      params.set('limit', String(postsPerPage))
      let url = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/community/posts`
      const qs = params.toString()
      if (qs) url += `?${qs}`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch posts')
      return res.json()
    }
  })

  const loadMorePosts = () => {
    if (postsData?.pagination && currentPage < postsData.pagination.totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const hasMorePosts = postsData?.pagination ? currentPage < postsData.pagination.totalPages : false

  // Mutations
  const createPostMutation = useMutation({
    mutationFn: async () => {
      const tags = postTags.split(',').map(t => t.trim()).filter(Boolean)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/community/posts`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title: postTitle, content: postContent, tags })
      })
      if (!res.ok) throw new Error('Failed to create post')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] })
      setIsCreateModalOpen(false)
      setPostTitle('')
      setPostContent('')
      setPostTags('')
    }
  })

  const createCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string, content: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/community/posts/${postId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content })
      })
      if (!res.ok) throw new Error('Failed to create comment')
      return res.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] })
      setCommentContent('')
    }
  })

  const toggleLikeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/community/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders()
      })
      if (!res.ok) throw new Error('Failed to toggle like')
      return res.json()
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['community', 'posts'] })
      const previousData = queryClient.getQueryData(['community', 'posts', debouncedSearch])
      queryClient.setQueryData(['community', 'posts', debouncedSearch], (old: any) => {
        if (!old?.posts) return old
        return {
          ...old,
          posts: old.posts.map((p: any) => {
            if (p._id === postId) {
              const hasLiked = userId && p.likes.includes(userId)
              return {
                ...p,
                likes: hasLiked ? p.likes.filter((id: string) => id !== userId) : [...p.likes, userId]
              }
            }
            return p
          })
        }
      })
      return { previousData }
    },
    onError: (err, postId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['community', 'posts', debouncedSearch], context.previousData)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] })
    }
  })

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/community/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: withCsrfHeaders()
      })
      if (!res.ok) throw new Error('Failed to delete post')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] })
    }
  })

  const deleteCommentMutation = useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string, commentId: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/community/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: withCsrfHeaders()
      })
      if (!res.ok) throw new Error('Failed to delete comment')
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] })
    }
  })

  // Feedback Helpers
  function startCooldown(remainMs: number) {
    setRateLimited(true)
    setCooldownSec(Math.ceil(remainMs / 1000))
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    cooldownTimer.current = setInterval(() => {
      setCooldownSec(prev => {
        if (prev <= 1) {
          clearInterval(cooldownTimer.current!)
          setRateLimited(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function checkClientRateLimit(): boolean {
    const now = Date.now()
    submitTimestamps.current = submitTimestamps.current.filter(t => now - t < RATE_WINDOW_MS)
    if (submitTimestamps.current.length >= RATE_LIMIT) {
      const oldest = submitTimestamps.current[0]
      const remainMs = RATE_WINDOW_MS - (now - oldest)
      startCooldown(remainMs)
      return false
    }
    return true
  }

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    if (!checkClientRateLimit()) {
      setError('Bạn đã gửi quá nhiều góp ý. Vui lòng thử lại sau.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/feedback`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ type, message: finalMessage }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gửi thất bại. Vui lòng thử lại.')
        return
      }
      submitTimestamps.current.push(Date.now())
      setSuccess(true)
      setMessage('')
      setReason('')
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F9F9F7] relative overflow-hidden">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-[#5D7B6F]/10 to-transparent blur-[120px] rounded-full mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gradient-to-tl from-[#A4C3A2]/20 to-transparent blur-[100px] rounded-full mix-blend-multiply" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <section className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/60 border border-white/80 shadow-sm backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-[#5D7B6F]" /> 
            <span className="font-black text-[11px] text-[#5D7B6F] uppercase tracking-widest">Cộng đồng FQuiz</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">
            Kết nối & Sẻ chia
          </h1>
          <p className="text-slate-500 font-medium text-base leading-relaxed max-w-xl mx-auto">
            Thảo luận về các câu hỏi hóc búa, tìm kiếm nhóm học tập, hoặc đóng góp ý kiến để giúp FQuiz ngày một hoàn thiện hơn.
          </p>
        </section>

        {/* QA Content */}
        <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-black text-slate-800 shrink-0">Thảo luận mới nhất</h2>
                
                <div className="flex w-full sm:w-auto items-center gap-3">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Tìm câu hỏi, tags..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-10 rounded-xl bg-white/50 border-white focus:border-[#5D7B6F]/40 shadow-sm"
                    />
                  </div>
                  <Button 
                    onClick={() => setIsFeedbackModalOpen(true)}
                    variant="outline"
                    className="border-[#5D7B6F]/30 bg-white hover:bg-[#5D7B6F]/5 text-[#5D7B6F] rounded-xl font-black px-4 shrink-0 h-10 shadow-sm"
                  >
                    <Lightbulb className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Góp ý</span>
                  </Button>
                  
                  {isAuthLoading ? (
                    <div className="h-10 w-36 bg-slate-200/50 rounded-xl animate-pulse shrink-0" />
                  ) : userId ? (
                  <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white rounded-xl shadow-lg shadow-[#5D7B6F]/20 font-black px-4 sm:px-6 shrink-0 h-10">
                        <Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Đăng câu hỏi</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent aria-describedby={undefined} className="sm:max-w-xl rounded-[32px] p-8 border border-white/80 bg-white/80 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
                      <DialogTitle className="text-2xl font-black text-slate-800 mb-4">Tạo bài đăng mới</DialogTitle>
                      <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="post-title" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiêu đề</label>
                        <Input 
                          id="post-title"
                          placeholder="Tiêu đề câu hỏi hoặc chủ đề..." 
                          value={postTitle}
                          onChange={(e) => setPostTitle(e.target.value)}
                          className="h-12 rounded-xl border-2 border-white bg-white/50 focus:border-[#5D7B6F]/40 shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="post-content" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung</label>
                        <Textarea 
                          id="post-content"
                          placeholder="Mô tả chi tiết nội dung bạn muốn chia sẻ..." 
                          value={postContent}
                          onChange={(e) => setPostContent(e.target.value)}
                          className="min-h-[120px] rounded-xl border-2 border-white bg-white/50 focus:border-[#5D7B6F]/40 shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="post-tags" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tags (cách nhau bởi dấu phẩy)</label>
                        <Input 
                          id="post-tags"
                          placeholder="VD: Toán rời rạc, Tìm nhóm học..." 
                          value={postTags}
                          onChange={(e) => setPostTags(e.target.value)}
                          className="h-12 rounded-xl border-2 border-white bg-white/50 focus:border-[#5D7B6F]/40 shadow-sm"
                        />
                      </div>
                      <Button 
                        onClick={() => createPostMutation.mutate()}
                        disabled={createPostMutation.isPending || !postTitle.trim() || !postContent.trim()}
                        className="w-full h-12 mt-4 bg-[#5D7B6F] hover:bg-[#4A6359] text-white rounded-xl font-black"
                      >
                        {createPostMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đăng bài'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                ) : (
                  <a href="/login" className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white rounded-xl shadow-lg shadow-[#5D7B6F]/20 font-black px-4 sm:px-6 shrink-0 h-10 inline-flex items-center justify-center text-sm transition-colors">
                    <Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Đăng câu hỏi</span>
                  </a>
                )}
              </div>
            </div>

              {isLoadingPosts ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-8 h-8 text-[#5D7B6F] animate-spin" />
                </div>
              ) : postsData?.posts?.length === 0 ? (
                <div className="text-center py-20 text-slate-400 font-medium">
                  Chưa có thảo luận nào. Hãy là người đầu tiên!
                </div>
              ) : (
                <div className="space-y-4">
                  {postsData?.posts?.map((p: any) => {
                    const isLiked = p.likes.includes(userId)
                    return (
                      <div 
                        key={p._id} 
                        onClick={() => setExpandedPostId(expandedPostId === p._id ? null : p._id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpandedPostId(expandedPostId === p._id ? null : p._id);
                          }
                        }}
                        className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all cursor-pointer group hover:-translate-y-0.5"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex gap-2 flex-wrap">
                            {p.tags?.map((tag: string) => (
                              <span key={tag} className="px-3 py-1 bg-[#5D7B6F]/10 text-[#5D7B6F] text-[10px] font-black uppercase tracking-widest rounded-lg">
                                {tag}
                              </span>
                            ))}
                          </div>
                          {userId && (String(p.authorId) === String(userId) || authData?.user?.role === 'admin') && (
                            <div className="relative flex items-center">
                              <AnimatePresence>
                                {confirmingDeletePostId === p._id ? (
                                  <motion.div
                                    initial={{ opacity: 0, width: 0, marginRight: 0 }}
                                    animate={{ opacity: 1, width: 'auto', marginRight: 8 }}
                                    exit={{ opacity: 0, width: 0, marginRight: 0 }}
                                    className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap"
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        deletePostMutation.mutate(p._id)
                                        setConfirmingDeletePostId(null)
                                      }}
                                      disabled={deletePostMutation.isPending}
                                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                                    >
                                      {deletePostMutation.isPending ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : 'Xóa'}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setConfirmingDeletePostId(null)
                                      }}
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors shrink-0"
                                    >
                                      Hủy
                                    </button>
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmingDeletePostId(p._id)
                                }}
                                title="Xóa bài đăng"
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2 group-hover:text-[#5D7B6F] transition-colors">{p.title}</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6 line-clamp-2">{p.content}</p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5D7B6F] to-[#455A52] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                              {p.authorName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700">{p.authorName}</p>
                              <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: vi })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <motion.button 
                              whileTap={userId ? { scale: 0.8 } : {}}
                              animate={isLiked ? { scale: [1, 1.2, 1] } : {}}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!userId) {
                                  window.location.href = '/login'
                                  return
                                }
                                toggleLikeMutation.mutate(p._id)
                              }}
                              title={userId ? (isLiked ? 'Bỏ thích' : 'Thích') : 'Đăng nhập để thích'}
                              className={cn("flex items-center gap-1.5 transition-colors p-1 rounded-lg", isLiked ? "text-red-500 bg-red-50" : "text-slate-400 hover:bg-slate-50")}
                            >
                              <motion.div 
                                animate={isLiked ? { scale: [1, 1.4, 1] } : {}} 
                                transition={{ duration: 0.3 }}
                              >
                                <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
                              </motion.div>
                              <span className="text-xs font-bold">{p.likes?.length || 0}</span>
                            </motion.button>
                            <div className="flex items-center gap-1.5 text-slate-400 p-1">
                              <MessageSquare className="w-4 h-4" />
                              <span className="text-xs font-bold">{p.comments?.length || 0}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-400 p-1">
                              {expandedPostId === p._id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Inline Expanded Section */}
                        <AnimatePresence>
                          {expandedPostId === p._id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                                <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap text-base">{p.content}</p>
                                <div className="space-y-3">
                                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Bình luận ({p.comments?.length || 0})</h4>
                                  {p.comments?.length === 0 ? (
                                    <p className="text-slate-400 font-medium text-center py-3 text-sm">Chưa có bình luận nào.</p>
                                  ) : (
                                    <div className="space-y-3">
                                      {p.comments?.map((comment: any) => (
                                        <div key={comment._id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group/comment relative">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#5D7B6F] to-[#455A52] flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                                                {comment.authorName.charAt(0).toUpperCase()}
                                              </div>
                                              <div>
                                                <p className="text-xs font-bold text-slate-700">{comment.authorName}</p>
                                                <span className="text-[10px] text-slate-400 font-medium">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}</span>
                                              </div>
                                            </div>
                                          </div>
                                          <p className="text-slate-600 font-medium text-sm whitespace-pre-wrap">{comment.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {/* Comment Input */}
                                <div className="pt-2">
                                  {isAuthLoading ? (
                                    <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                                  ) : userId ? (
                                    <div className="flex gap-2">
                                      <Input
                                        value={commentContent}
                                        onChange={(e) => setCommentContent(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey && commentContent.trim()) {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            createCommentMutation.mutate({ postId: p._id, content: commentContent })
                                            setCommentContent('')
                                          }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="Viết bình luận..."
                                        className="flex-1 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-[#5D7B6F]/30"
                                      />
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          createCommentMutation.mutate({ postId: p._id, content: commentContent })
                                          setCommentContent('')
                                        }}
                                        disabled={!commentContent.trim() || createCommentMutation.isPending}
                                        className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white rounded-xl px-6 font-black shrink-0"
                                      >
                                        {createCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                      </Button>
                                    </div>
                                  ) : (
                                    <a href="/login" className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold text-[#5D7B6F] bg-[#5D7B6F]/5 hover:bg-[#5D7B6F]/10 rounded-xl transition-colors">
                                      Đăng nhập để bình luận
                                    </a>
                                  )}
                                </div>

                                <button onClick={(e) => { e.stopPropagation(); setExpandedPostId(null) }} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors mx-auto pt-2">
                                  <ChevronUp className="w-3.5 h-3.5" /> Thu nhỏ
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              )}
              
              {hasMorePosts && (
                <div className="text-center pt-4">
                  <Button 
                    onClick={loadMorePosts}
                    disabled={isLoadingPosts}
                    variant="outline" 
                    className="rounded-full px-6 bg-white/50 border-white/80 text-[#5D7B6F] font-black hover:bg-white transition-all shadow-sm"
                  >
                    {isLoadingPosts ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang tải...
                      </>
                    ) : (
                      'Tải thêm câu hỏi'
                    )}
                  </Button>
                </div>
              )}
            </div>

      </div>

      {/* Removed FAB */}

      {/* Feedback Modal */}
      <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-2xl rounded-[32px] p-8 border border-white/80 bg-white/90 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
          <DialogTitle className="text-2xl font-black text-slate-800 mb-2">Góp ý phát triển</DialogTitle>
          <p className="text-sm font-medium text-slate-500 mb-6">Mỗi ý kiến đóng góp của bạn đều giúp FQuiz hoàn thiện hơn mỗi ngày.</p>
          
          {success ? (
            <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
              <div className="w-20 h-20 rounded-full bg-[#166534]/10 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-[#166534]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800">Cảm ơn bạn!</h3>
                <p className="text-slate-500 font-medium text-sm">
                  Góp ý của bạn đã được gửi đến đội ngũ phát triển.
                </p>
              </div>
              <Button
                onClick={() => setSuccess(false)}
                variant="outline"
                className="rounded-full px-6 border-slate-200 text-[#5D7B6F] font-black hover:bg-slate-50 transition-all"
              >
                Gửi thêm góp ý
              </Button>
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="space-y-5">
              {/* Type selector */}
              <div className="space-y-2">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                  Phân loại
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FEEDBACK_TYPES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setType(value); setError('') }}
                      className={cn(
                        'flex flex-col items-center gap-2 px-2 py-4 rounded-2xl border-2 transition-all',
                        type === value
                          ? 'border-[#5D7B6F] bg-[#5D7B6F]/5 text-[#5D7B6F]'
                          : 'border-slate-200 bg-white/50 text-slate-400 hover:border-slate-300 hover:text-slate-600 shadow-sm'
                      )}
                    >
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
                      <span className="text-[10px] font-black text-center uppercase tracking-wider">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Input */}
              <AnimatePresence>
                {type === 'other' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1.5 pt-2">
                      <label htmlFor="feedback-reason" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Lý do
                      </label>
                      <Textarea
                        id="feedback-reason"
                        value={reason}
                        onChange={(e) => { setReason(e.target.value.slice(0, 200)); setError('') }}
                        placeholder="Cho chúng tôi biết lý do cụ thể..."
                        className="h-[68px] rounded-2xl border-2 px-4 py-3 text-sm outline-none transition-all duration-300 font-medium border-slate-200 bg-white/50 text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10 shadow-sm resize-none"
                      />
                      <p className={cn('text-[10px] font-black text-right mt-1', 200 - reason.length < 20 ? 'text-orange-500' : 'text-slate-400')}>
                        {200 - reason.length} ký tự còn lại
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message Input */}
              <div className="space-y-1.5">
                <label htmlFor="feedback-detail" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Chi tiết
                </label>
                <Textarea
                  id="feedback-detail"
                  value={message}
                  onChange={(e) => { setMessage(e.target.value.slice(0, 1000)); setError('') }}
                  placeholder="Mô tả chi tiết góp ý của bạn..."
                  className="h-[140px] rounded-2xl border-2 px-4 py-3 text-sm outline-none transition-all duration-300 font-medium border-slate-200 bg-white/50 text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10 shadow-sm resize-none"
                />
                <div className="flex justify-between items-center mt-1">
                  {error
                    ? <p className="text-xs font-bold text-red-500 ml-1">{error}</p>
                    : <span />
                  }
                  <p className={cn('text-[10px] font-black', 1000 - message.length < 50 ? 'text-orange-500' : 'text-slate-400')}>
                    {1000 - message.length} ký tự còn lại
                  </p>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={!canSubmit}
                className="group relative w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#6B8D7F] to-[#5D7B6F] hover:from-[#5D7B6F] hover:to-[#4A6359] text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-[0_8px_20px_rgba(93,123,111,0.25)] border border-[#7BA090]/50 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-6"
              >
                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin drop-shadow-sm" />
                ) : rateLimited ? (
                  <span className="tracking-wide drop-shadow-sm">Thử lại sau {Math.floor(cooldownSec / 60)}:{String(cooldownSec % 60).padStart(2, '0')}</span>
                ) : (
                  <>
                    <span className="tracking-wide drop-shadow-sm">Gửi đi</span>
                    <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform drop-shadow-sm" />
                  </>
                )}
              </motion.button>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
