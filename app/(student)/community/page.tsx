'use client'

import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles, Bug, Lightbulb, BookOpen, MessageCircle, Send, CheckCircle2,
  Loader2, Heart, MessageSquare, Clock, Plus, Search, Trash2,
  ChevronDown, ChevronUp, Tag, ShieldCheck, Flame, Filter, RefreshCw, X
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

const DEFAULT_FALLBACK_TAGS = ['Ôn thi', 'Hỏi đáp', 'Góp ý']

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

  // Delete confirmation state
  const [confirmingDeletePostId, setConfirmingDeletePostId] = useState<string | null>(null)

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Queries
  const { data: postsData, isLoading: isLoadingPosts, isRefetching } = useQuery({
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
    },
    retry: 1,
    retryDelay: 1000,
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
    onSuccess: () => {
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
      const previousData = queryClient.getQueryData(['community', 'posts', debouncedSearch, currentPage])
      queryClient.setQueryData(['community', 'posts', debouncedSearch, currentPage], (old: any) => {
        if (!old?.posts) return old
        return {
          ...old,
          posts: old.posts.map((p: any) => {
            if (p._id === postId) {
              const hasLiked = userId && p.likes?.includes(userId)
              return {
                ...p,
                likes: hasLiked ? p.likes.filter((id: string) => id !== userId) : [...(p.likes || []), userId]
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
        queryClient.setQueryData(['community', 'posts', debouncedSearch, currentPage], context.previousData)
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
    <div className="min-h-[calc(100vh-80px)] bg-[#F9F9F7] relative">
      {/* Background Mesh Glow */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden transform-gpu -z-10">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#5D7B6F]/15 via-[#A4C3A2]/10 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      {/* Main Container - Centered max-w-6xl */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-1 sm:pt-2 md:pt-3 pb-6 md:pb-10 relative z-10 space-y-6 sm:space-y-8">

        {/* Hero Banner Card */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-[#455A52] to-[#5D7B6F] text-white p-6 sm:p-8 md:p-10 shadow-xl border border-white/10">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none transform-gpu" />
          <div className="absolute right-1/4 top-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none transform-gpu" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-black text-[11px] uppercase tracking-widest">Cộng đồng Học tập FQuiz</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                Kết nối & Sẻ chia kiến thức
              </h1>
              <p className="text-emerald-100/90 font-medium text-sm sm:text-base leading-relaxed">
                Thảo luận các câu hỏi hóc búa, tìm nhóm ôn thi, chia sẻ mẹo làm bài hoặc góp ý để cùng xây dựng FQuiz tốt hơn mỗi ngày.
              </p>
            </div>

            {/* Quick Actions in Hero */}
            <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
              {isAuthLoading ? (
                <div className="h-12 w-36 bg-white/20 rounded-2xl animate-pulse" />
              ) : userId ? (
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-12 bg-white text-slate-900 hover:bg-emerald-50 font-black px-6 rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2">
                      <Plus className="w-5 h-5 text-[#5D7B6F]" />
                      <span>Đăng câu hỏi mới</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent aria-describedby={undefined} className="sm:max-w-xl rounded-[32px] p-6 sm:p-8 border border-white/80 bg-white/95 backdrop-blur-2xl shadow-2xl">
                    <DialogTitle className="text-2xl font-black text-slate-800 mb-4">Tạo bài đăng mới</DialogTitle>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="post-title" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiêu đề câu hỏi / Chủ đề</label>
                        <Input 
                          id="post-title"
                          placeholder="Nhập tiêu đề rõ ràng..." 
                          value={postTitle}
                          onChange={(e) => setPostTitle(e.target.value)}
                          className="h-12 rounded-xl border-2 border-slate-200 focus:border-[#5D7B6F] font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="post-content" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung chi tiết</label>
                        <Textarea 
                          id="post-content"
                          placeholder="Mô tả chi tiết thắc mắc hoặc nội dung bạn muốn chia sẻ..." 
                          value={postContent}
                          onChange={(e) => setPostContent(e.target.value)}
                          className="min-h-[130px] rounded-xl border-2 border-slate-200 focus:border-[#5D7B6F] font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="post-tags" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tags (cách nhau bởi dấu phẩy)</label>
                        <Input 
                          id="post-tags"
                          placeholder="VD: Toán rời rạc, Tiếng Anh B1, Flashcards" 
                          value={postTags}
                          onChange={(e) => setPostTags(e.target.value)}
                          className="h-12 rounded-xl border-2 border-slate-200 focus:border-[#5D7B6F] font-medium"
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
              ) : (
                <a href="/login" className="h-12 bg-white text-slate-900 hover:bg-emerald-50 font-black px-6 rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5 text-[#5D7B6F]" />
                  <span>Đăng câu hỏi mới</span>
                </a>
              )}

              <Button
                onClick={() => setIsFeedbackModalOpen(true)}
                variant="outline"
                className="h-12 bg-white/10 hover:bg-white/20 border-white/30 text-white font-bold px-5 rounded-2xl backdrop-blur-md transition-all text-sm flex items-center justify-center gap-2"
              >
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Góp ý & Báo lỗi</span>
              </Button>
            </div>
          </div>
        </section>

        {/* Main 2-Column Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (8 cols): Feed, Search & Posts */}
          <main className="lg:col-span-8 space-y-6">

            {/* Action & Filter Header Bar */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-black text-slate-800">Thảo luận mới nhất</h2>
                {isRefetching && <Loader2 className="w-4 h-4 animate-spin text-[#5D7B6F] ml-1" />}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Tìm kiếm câu hỏi, tags..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-8 h-10 rounded-xl bg-slate-50 border-slate-200 focus:border-[#5D7B6F] text-xs font-medium"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Posts Feed Section */}
            {isLoadingPosts ? (
              <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-12 text-center space-y-4 shadow-xs">
                <Loader2 className="w-8 h-8 text-[#5D7B6F] animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400">Đang tải danh sách thảo luận...</p>
              </div>
            ) : postsData?.posts?.length === 0 ? (
              /* Rich Empty State Card */
              <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-10 md:p-14 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#5D7B6F] flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-xl font-black text-slate-800">
                    {debouncedSearch ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có thảo luận nào'}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    {debouncedSearch 
                      ? `Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc từ khóa "${debouncedSearch}".` 
                      : 'Hãy là người đầu tiên đặt câu hỏi hoặc chia sẻ góc nhìn học tập với cộng đồng FQuiz!'}
                  </p>
                </div>
                {debouncedSearch ? (
                  <Button 
                    onClick={() => setSearchQuery('')}
                    variant="outline"
                    className="rounded-xl text-xs font-bold text-[#5D7B6F] border-emerald-200"
                  >
                    <RefreshCw className="w-4 h-4 mr-1.5" /> Xóa bộ lọc tìm kiếm
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white rounded-xl font-bold text-xs px-6 py-2.5 shadow-md"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Tạo bài đăng đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {postsData?.posts?.map((p: any) => (
                  <PostItemCard
                    key={p._id}
                    p={p}
                    userId={userId}
                    authRole={authData?.user?.role}
                    expandedPostId={expandedPostId}
                    setExpandedPostId={setExpandedPostId}
                    confirmingDeletePostId={confirmingDeletePostId}
                    setConfirmingDeletePostId={setConfirmingDeletePostId}
                    deletePostMutation={deletePostMutation}
                    toggleLikeMutation={toggleLikeMutation}
                    createCommentMutation={createCommentMutation}
                    commentContent={commentContent}
                    setCommentContent={setCommentContent}
                    isAuthLoading={isAuthLoading}
                  />
                ))}
              </div>
            )}

            {/* Pagination / Load More */}
            {hasMorePosts && (
              <div className="text-center pt-2">
                <Button 
                  onClick={loadMorePosts}
                  disabled={isLoadingPosts}
                  variant="outline" 
                  className="rounded-2xl px-8 py-3 bg-white/80 border-slate-200 text-[#5D7B6F] font-black hover:bg-white transition-all shadow-xs text-xs"
                >
                  {isLoadingPosts ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang tải thêm...
                    </>
                  ) : (
                    'Xem thêm bài đăng cũ hơn'
                  )}
                </Button>
              </div>
            )}
          </main>

          {/* Right Column (4 cols): Community Sidebar Widgets */}
          <aside className="lg:col-span-4 space-y-6">

            {/* Widget 1: Popular Tags */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-black text-sm border-b border-slate-100 pb-3">
                <Tag className="w-4 h-4 text-[#5D7B6F]" />
                <span>Chủ đề thảo luận nổi bật</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {((postsData?.popularTags && postsData.popularTags.length > 0) ? postsData.popularTags : DEFAULT_FALLBACK_TAGS).map((tag: string) => {
                  const isActive = searchQuery.toLowerCase() === tag.toLowerCase()
                  return (
                    <button
                      key={tag}
                      onClick={() => setSearchQuery(isActive ? '' : tag)}
                      className={cn(
                        'text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer border',
                        isActive 
                          ? 'bg-[#5D7B6F] text-white border-[#5D7B6F] shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-emerald-50 hover:text-[#5D7B6F] hover:border-emerald-200'
                      )}
                    >
                      #{tag}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Widget 2: Feedback Promotion */}
            <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/60 border border-emerald-100 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#5D7B6F] font-black text-sm">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Đóng góp ý kiến cho FQuiz</span>
              </div>
              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                Bạn gặp phải sự cố kỹ thuật hoặc có ý tưởng tính năng mới? Đừng ngần ngại gửi feedback cho chúng tôi!
              </p>
              <Button
                onClick={() => setIsFeedbackModalOpen(true)}
                className="w-full bg-[#5D7B6F] hover:bg-[#4A6359] text-white rounded-xl font-bold text-xs py-2.5 shadow-xs"
              >
                Gửi góp ý ngay
              </Button>
            </div>

            {/* Widget 3: Community Guidelines */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-black text-sm border-b border-slate-100 pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Quy tắc văn hóa cộng đồng</span>
              </div>
              <ul className="space-y-2 text-xs font-medium text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#5D7B6F] font-bold">•</span>
                  <span>Tôn trọng người dùng khác & không ngôn từ xúc phạm.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#5D7B6F] font-bold">•</span>
                  <span>Đặt tiêu đề rõ ràng, đúng trọng tâm bài viết.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#5D7B6F] font-bold">•</span>
                  <span>Không đăng tải nội dung quảng cáo hoặc rác.</span>
                </li>
              </ul>
            </div>

          </aside>
        </div>
      </div>

      {/* Feedback Modal */}
      <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-2xl rounded-[32px] p-6 sm:p-8 border border-white/80 bg-white/95 backdrop-blur-3xl shadow-2xl">
          <DialogTitle className="text-2xl font-black text-slate-800 mb-1">Góp ý phát triển FQuiz</DialogTitle>
          <p className="text-xs font-medium text-slate-500 mb-5">Mỗi ý kiến đóng góp của bạn đều giúp FQuiz hoàn thiện hơn mỗi ngày.</p>
          
          {success ? (
            <div className="flex flex-col items-center justify-center text-center space-y-6 py-10">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-[#5D7B6F]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-800">Cảm ơn bạn!</h3>
                <p className="text-slate-500 font-medium text-xs">
                  Góp ý của bạn đã được gửi đến đội ngũ phát triển.
                </p>
              </div>
              <Button
                onClick={() => setSuccess(false)}
                variant="outline"
                className="rounded-xl px-6 border-slate-200 text-[#5D7B6F] font-bold text-xs"
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
                        'flex flex-col items-center gap-2 px-2 py-3 rounded-2xl border-2 transition-all cursor-pointer',
                        type === value
                          ? 'border-[#5D7B6F] bg-[#5D7B6F]/10 text-[#5D7B6F]'
                          : 'border-slate-200 bg-white/50 text-slate-500 hover:border-slate-300'
                      )}
                    >
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
                      <span className="text-[10px] font-bold text-center uppercase tracking-wider">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Input */}
              <AnimatePresence>
                {type === 'other' && (
                  <motion.div
                    initial={{ opacity: 0, maxHeight: 0 }}
                    animate={{ opacity: 1, maxHeight: 120 }}
                    exit={{ opacity: 0, maxHeight: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1.5 pt-1">
                      <label htmlFor="feedback-reason" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Lý do
                      </label>
                      <Textarea
                        id="feedback-reason"
                        value={reason}
                        onChange={(e) => { setReason(e.target.value.slice(0, 200)); setError('') }}
                        placeholder="Cho chúng tôi biết lý do cụ thể..."
                        className="h-[68px] rounded-2xl border-2 px-4 py-3 text-xs outline-none font-medium border-slate-200 bg-white text-slate-900 focus:border-[#5D7B6F] resize-none"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message Input */}
              <div className="space-y-1.5">
                <label htmlFor="feedback-detail" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Chi tiết góp ý
                </label>
                <Textarea
                  id="feedback-detail"
                  value={message}
                  onChange={(e) => { setMessage(e.target.value.slice(0, 1000)); setError('') }}
                  placeholder="Mô tả chi tiết góp ý của bạn..."
                  className="h-[130px] rounded-2xl border-2 px-4 py-3 text-xs outline-none font-medium border-slate-200 bg-white text-slate-900 focus:border-[#5D7B6F] resize-none"
                />
                <div className="flex justify-between items-center mt-1">
                  {error ? <p className="text-xs font-bold text-red-500 ml-1">{error}</p> : <span />}
                  <p className="text-[10px] font-bold text-slate-400">
                    {1000 - message.length} ký tự còn lại
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full flex items-center justify-center gap-2 bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-black py-3.5 rounded-2xl transition-all shadow-md disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : rateLimited ? (
                  <span className="text-xs">Thử lại sau {Math.floor(cooldownSec / 60)}:{String(cooldownSec % 60).padStart(2, '0')}</span>
                ) : (
                  <>
                    <span className="text-sm">Gửi góp ý</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}

function PostItemCard({
  p,
  userId,
  authRole,
  expandedPostId,
  setExpandedPostId,
  confirmingDeletePostId,
  setConfirmingDeletePostId,
  deletePostMutation,
  toggleLikeMutation,
  createCommentMutation,
  commentContent,
  setCommentContent,
  isAuthLoading,
}: any) {
  const isLiked = p.likes?.includes(userId)

  return (
    <div 
      onClick={() => setExpandedPostId(expandedPostId === p._id ? null : p._id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setExpandedPostId(expandedPostId === p._id ? null : p._id)
        }
      }}
      className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:-translate-y-0.5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {p.tags?.map((tag: string) => (
            <span key={tag} className="px-2.5 py-0.5 bg-[#5D7B6F]/10 text-[#5D7B6F] text-[10px] font-black uppercase tracking-wider rounded-lg border border-[#5D7B6F]/20">
              #{tag}
            </span>
          ))}
        </div>

        {userId && (String(p.authorId) === String(userId) || authRole === 'admin') && (
          <div className="relative flex items-center shrink-0">
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
                    className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold rounded-lg transition-colors shrink-0"
                  >
                    {deletePostMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : 'Xóa bài'}
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
                setConfirmingDeletePostId(p._id)
              }}
              title="Xóa bài đăng"
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-1.5 group-hover:text-[#5D7B6F] transition-colors leading-snug">
          {p.title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed line-clamp-2">
          {p.content}
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#5D7B6F] to-[#455A52] flex items-center justify-center text-white font-bold text-xs shadow-xs">
            {p.authorName ? p.authorName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">{p.authorName}</p>
            <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: vi })}
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
              toggleLikeMutation.mutate(p._id)
            }}
            title={userId ? (isLiked ? 'Bỏ thích' : 'Thích') : 'Đăng nhập để thích'}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-xl transition-all cursor-pointer text-xs font-bold",
              isLiked ? "text-red-500 bg-red-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
            <span>{p.likes?.length || 0}</span>
          </button>

          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold px-2 py-1">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <span>{p.comments?.length || 0}</span>
          </div>

          <div className="text-slate-400 p-1">
            {expandedPostId === p._id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expandedPostId === p._id && (
          <PostExpandedDetails
            p={p}
            userId={userId}
            isAuthLoading={isAuthLoading}
            commentContent={commentContent}
            setCommentContent={setCommentContent}
            createCommentMutation={createCommentMutation}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PostExpandedDetails({
  p,
  userId,
  isAuthLoading,
  commentContent,
  setCommentContent,
  createCommentMutation,
}: any) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
          {p.content}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Bình luận ({p.comments?.length || 0})
          </h4>

          {p.comments?.length === 0 ? (
            <p className="text-slate-400 font-medium text-center py-4 text-xs bg-slate-50/50 rounded-2xl">
              Chưa có bình luận nào. Hãy gửi bình luận đầu tiên!
            </p>
          ) : (
            <div className="space-y-2.5">
              {p.comments?.map((comment: any) => (
                <div key={comment._id} className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#5D7B6F] to-[#455A52] flex items-center justify-center text-white font-bold text-[10px]">
                        {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <span className="text-xs font-bold text-slate-700">{comment.authorName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 whitespace-pre-wrap pl-8">
                    {comment.content}
                  </p>
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
            <div className="flex items-center gap-2">
              <Input
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && commentContent.trim()) {
                    e.preventDefault()
                    e.stopPropagation()
                    createCommentMutation.mutate({ postId: p._id, content: commentContent })
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Viết bình luận... (Nhấn Enter để gửi)"
                className="h-10 text-xs font-medium rounded-xl border-slate-200 bg-white focus:border-[#5D7B6F]"
              />
              <Button
                type="button"
                disabled={!commentContent.trim() || createCommentMutation.isPending}
                onClick={(e) => {
                  e.stopPropagation()
                  if (commentContent.trim()) {
                    createCommentMutation.mutate({ postId: p._id, content: commentContent })
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
