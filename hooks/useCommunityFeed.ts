'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useAuth } from '@/hooks/auth/useAuth'

export const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Báo lỗi' },
  { value: 'feature', label: 'Đề xuất tính năng' },
  { value: 'content', label: 'Góp ý nội dung' },
  { value: 'other', label: 'Khác' },
] as const

export type FeedbackType = typeof FEEDBACK_TYPES[number]['value']

const RATE_LIMIT = 3
const RATE_WINDOW_MS = 60 * 60 * 1000

export function useCommunityFeed() {
  const { data: authData, isLoading: isAuthLoading } = useAuth()
  const userId = authData?.user?._id
  const queryClient = useQueryClient()

  // Feedback States
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
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
  const [confirmingDeletePostId, setConfirmingDeletePostId] = useState<string | null>(null)

  // Debounce search
  useEffect(() => {
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
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 1000,
  })

  const loadMorePosts = useCallback(() => {
    if (postsData?.pagination && currentPage < postsData.pagination.totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }, [postsData, currentPage])

  const hasMorePosts = postsData?.pagination ? currentPage < postsData.pagination.totalPages : false

  // Mutations
  const createPostMutation = useMutation({
    mutationFn: async () => {
      const tags = postTags.split(',').map(t => t.trim()).filter(Boolean)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/community/posts`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title: postTitle, content: postContent, tags }),
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
    },
  })

  const createCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/community/posts/${postId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to create comment')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] })
      setCommentContent('')
    },
  })

  const toggleLikeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/community/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders(),
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
                likes: hasLiked ? p.likes.filter((id: string) => id !== userId) : [...(p.likes || []), userId],
              }
            }
            return p
          }),
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
    },
  })

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/community/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: withCsrfHeaders(),
      })
      if (!res.ok) throw new Error('Failed to delete post')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] })
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string; commentId: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/community/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: withCsrfHeaders(),
      })
      if (!res.ok) throw new Error('Failed to delete comment')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] })
    },
  })

  const recordViewMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/community/posts/${postId}/view`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders(),
      })
      if (!res.ok) throw new Error('Failed to record view')
      return res.json()
    },
    onSuccess: (data, postId) => {
      queryClient.setQueryData(['community', 'posts', debouncedSearch, currentPage], (old: any) => {
        if (!old?.posts) return old
        return {
          ...old,
          posts: old.posts.map((post: any) => {
            if (post._id === postId && userId) {
              const currentViews = post.views || []
              if (String(post.authorId) !== String(userId) && !currentViews.includes(userId)) {
                return { ...post, views: [...currentViews, userId] }
              }
            }
            return post
          }),
        }
      })
    },
  })

  const startCooldown = useCallback((remainMs: number) => {
    setRateLimited(true)
    setCooldownSec(Math.ceil(remainMs / 1000))
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    cooldownTimer.current = setInterval(() => {
      setCooldownSec(prev => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current)
          setRateLimited(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const checkClientRateLimit = useCallback((): boolean => {
    const now = Date.now()
    submitTimestamps.current = submitTimestamps.current.filter(t => now - t < RATE_WINDOW_MS)
    if (submitTimestamps.current.length >= RATE_LIMIT) {
      const oldest = submitTimestamps.current[0]
      const remainMs = RATE_WINDOW_MS - (now - oldest)
      startCooldown(remainMs)
      return false
    }
    return true
  }, [startCooldown])

  const handleFeedbackSubmit = useCallback(async (e: React.FormEvent) => {
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
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ type, message: finalMessage }),
      })

      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          setError('Hệ thống nhận thấy quá nhiều gửi từ thiết bị này. Vui lòng đợi.')
          startCooldown(60 * 1000)
        } else {
          setError(data.error || 'Có lỗi xảy ra, vui lòng thử lại.')
        }
        return
      }

      submitTimestamps.current.push(Date.now())
      setSuccess(true)
      setMessage('')
      setReason('')
    } catch {
      setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại mạng.')
    } finally {
      setLoading(false)
    }
  }, [canSubmit, checkClientRateLimit, type, finalMessage, startCooldown])

  const handleCloseFeedbackModal = useCallback(() => {
    setIsFeedbackModalOpen(false)
    setSuccess(false)
    setError('')
  }, [])

  return {
    userId,
    authData,
    isAuthLoading,
    postsData,
    isLoadingPosts,
    isRefetching,
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    hasMorePosts,
    loadMorePosts,
    isCreateModalOpen,
    setIsCreateModalOpen,
    postTitle,
    setPostTitle,
    postContent,
    setPostContent,
    postTags,
    setPostTags,
    commentContent,
    setCommentContent,
    expandedPostId,
    setExpandedPostId,
    confirmingDeletePostId,
    setConfirmingDeletePostId,
    createPostMutation,
    createCommentMutation,
    toggleLikeMutation,
    deletePostMutation,
    deleteCommentMutation,
    recordViewMutation,
    isFeedbackModalOpen,
    setIsFeedbackModalOpen,
    type,
    setType,
    message,
    setMessage,
    reason,
    setReason,
    loading,
    success,
    setSuccess,
    error,
    rateLimited,
    cooldownSec,
    canSubmit,
    handleFeedbackSubmit,
    handleCloseFeedbackModal,
  }
}
