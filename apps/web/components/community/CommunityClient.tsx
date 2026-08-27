'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Flame, Loader2, MessageSquare, RefreshCw } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Skeleton } from '@/components/shared/ui/skeleton'
import { useCommunityFeed } from '@/hooks/useCommunityFeed'
import { useAuthPrompt } from '@/store/shared/auth-prompt-store'
import { CommunityHeader } from '@/components/community/CommunityHeader'
import { CommunitySearchFilterBar } from '@/components/community/CommunitySearchFilterBar'
import { CommunityPostCard } from '@/components/community/CommunityPostCard'
import { CommunitySidebar } from '@/components/community/CommunitySidebar'
import { CommunitySkeleton } from '@/components/community/CommunitySkeleton'

const CreatePostModal = dynamic(() => import('@/components/community/CreatePostModal'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false,
})

const FeedbackModal = dynamic(() => import('@/components/community/FeedbackModal'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false,
})

export function CommunityClient() {
  const {
    userId,
    authData,
    isAuthLoading,
    postsData,
    isLoadingPosts,
    isRefetching,
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
  } = useCommunityFeed()

  const { openAuthPrompt } = useAuthPrompt()

  if (isLoadingPosts) {
    return <CommunitySkeleton />
  }

  const handleGuestAuthPrompt = (featureName: string, title: string, description: string) => {
    openAuthPrompt({
      featureName,
      title,
      description,
      targetUrl: '/community',
    })
  }

  return (
    <div className="min-h-[calc(100vh-80px)] relative">
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden transform-gpu -z-10">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/15 via-primary/5 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-1 sm:pt-2 md:pt-3 pb-6 md:pb-10 relative z-10 space-y-6 sm:space-y-8">
        {/* Header & Main Navigation */}
        <CommunityHeader
          onOpenFeedback={() => {
            if (!userId) {
              handleGuestAuthPrompt(
                'Góp ý phát triển',
                'Đăng nhập để gửi góp ý',
                'Vui lòng đăng nhập hoặc tạo tài khoản để gửi ý kiến đóng góp, báo lỗi hoặc đề xuất tính năng mới cho FQuiz.'
              )
            } else {
              setIsFeedbackModalOpen(true)
            }
          }}
          onOpenCreatePost={() => {
            if (!userId) {
              handleGuestAuthPrompt(
                'Đăng bài thảo luận',
                'Đăng nhập để tạo bài viết',
                'Vui lòng đăng nhập hoặc tạo tài khoản để đặt câu hỏi, chia sẻ kinh nghiệm học tập cùng cộng đồng FQuiz.'
              )
            } else {
              setIsCreateModalOpen(true)
            }
          }}
        />

        {/* Search & Tags Filter Bar */}
        <CommunitySearchFilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          availableTags={postsData?.popularTags}
        />

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <main className="lg:col-span-8 space-y-6">
            <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-black text-foreground">Thảo luận mới nhất</h2>
                {isRefetching && <Loader2 className="w-4 h-4 animate-spin text-primary ml-1" />}
              </div>
            </div>

            {postsData?.posts?.length === 0 ? (
              <div className="bg-card backdrop-blur-xl border border-border rounded-3xl p-10 md:p-14 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-xs">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-foreground">Chưa có bài thảo luận nào</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Hãy là người đầu tiên đặt câu hỏi hoặc chia sẻ tài liệu ôn thi bổ ích tới cộng đồng FQuiz!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {postsData?.posts?.map((post: any) => (
                  <CommunityPostCard
                    key={post._id}
                    post={post}
                    userId={userId}
                    authRole={authData?.user?.role}
                    expandedPostId={expandedPostId}
                    setExpandedPostId={setExpandedPostId}
                    confirmingDeletePostId={confirmingDeletePostId}
                    setConfirmingDeletePostId={setConfirmingDeletePostId}
                    deletePostMutation={deletePostMutation}
                    deleteCommentMutation={deleteCommentMutation}
                    recordViewMutation={recordViewMutation}
                    toggleLikeMutation={toggleLikeMutation}
                    createCommentMutation={createCommentMutation}
                    commentContent={commentContent}
                    setCommentContent={setCommentContent}
                    isAuthLoading={isAuthLoading}
                  />
                ))}

                {hasMorePosts && (
                  <div className="text-center pt-4">
                    <Button
                      onClick={loadMorePosts}
                      variant="outline"
                      className="px-6 py-2.5 rounded-2xl text-xs font-bold border-border hover:bg-muted cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" /> Xem thêm bài viết cũ hơn
                    </Button>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Right Sidebar: Featured Topics & Feedback */}
          <CommunitySidebar
            postsData={postsData}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenFeedback={() => {
              if (!userId) {
                handleGuestAuthPrompt(
                  'Góp ý phát triển',
                  'Đăng nhập để gửi góp ý',
                  'Vui lòng đăng nhập hoặc tạo tài khoản để gửi ý kiến đóng góp, báo lỗi hoặc đề xuất tính năng mới cho FQuiz.'
                )
              } else {
                setIsFeedbackModalOpen(true)
              }
            }}
          />
        </div>
      </div>

      {/* Modal: Create Post */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        postTitle={postTitle}
        setPostTitle={setPostTitle}
        postContent={postContent}
        setPostContent={setPostContent}
        postTags={postTags}
        setPostTags={setPostTags}
        createPostMutation={createPostMutation}
      />

      {/* Modal: Send Feedback */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={handleCloseFeedbackModal}
        type={type}
        setType={setType}
        message={message}
        setMessage={setMessage}
        reason={reason}
        setReason={setReason}
        loading={loading}
        success={success}
        setSuccess={setSuccess}
        error={error}
        rateLimited={rateLimited}
        cooldownSec={cooldownSec}
        canSubmit={canSubmit}
        handleFeedbackSubmit={handleFeedbackSubmit}
      />
    </div>
  )
}
