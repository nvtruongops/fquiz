'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Plus, Flame, Loader2, MessageSquare, RefreshCw } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Skeleton } from '@/components/shared/ui/skeleton'
import { useCommunityFeed } from '@/hooks/useCommunityFeed'
import { CommunityHeader } from '@/components/community/CommunityHeader'
import { CommunitySearchFilterBar } from '@/components/community/CommunitySearchFilterBar'
import { CommunityPostCard } from '@/components/community/CommunityPostCard'
import { CommunitySidebar } from '@/components/community/CommunitySidebar'

const CreatePostModal = dynamic(() => import('@/components/community/CreatePostModal'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false,
})

const FeedbackModal = dynamic(() => import('@/components/community/FeedbackModal'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false,
})

export default function CommunityPage() {
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

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F9F9F7] relative">
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden transform-gpu -z-10">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#5D7B6F]/15 via-[#A4C3A2]/10 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-1 sm:pt-2 md:pt-3 pb-6 md:pb-10 relative z-10 space-y-6 sm:space-y-8">
        {/* Header & Main Navigation */}
        <CommunityHeader
          onOpenFeedback={() => setIsFeedbackModalOpen(true)}
          onOpenCreatePost={() => {
            if (!userId) {
              window.location.href = '/login'
            } else {
              setIsCreateModalOpen(true)
            }
          }}
        />

        {/* Search & Tags Filter Bar */}
        <CommunitySearchFilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <main className="lg:col-span-8 space-y-6">
            <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-black text-slate-800">Thảo luận mới nhất</h2>
                {isRefetching && <Loader2 className="w-4 h-4 animate-spin text-[#5D7B6F] ml-1" />}
              </div>
            </div>

            {isLoadingPosts ? (
              <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-12 text-center space-y-4 shadow-xs">
                <Loader2 className="w-8 h-8 text-[#5D7B6F] animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400">Đang tải danh sách thảo luận...</p>
              </div>
            ) : postsData?.posts?.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-10 md:p-14 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#5D7B6F] flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-xl font-black text-slate-800">
                    {searchQuery ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có thảo luận nào'}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    {searchQuery
                      ? `Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc tìm kiếm "${searchQuery}".`
                      : 'Hãy là người đầu tiên đặt câu hỏi hoặc chia sẻ góc nhìn học tập với cộng đồng FQuiz!'}
                  </p>
                </div>
                {searchQuery ? (
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
                  <CommunityPostCard
                    key={p._id}
                    post={p}
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
              </div>
            )}

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
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải thêm...
                    </>
                  ) : (
                    'Xem thêm bài đăng cũ hơn'
                  )}
                </Button>
              </div>
            )}
          </main>

          {/* Right Column (4 cols): Community Sidebar */}
          <CommunitySidebar
            postsData={postsData}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenFeedback={() => setIsFeedbackModalOpen(true)}
          />
        </div>
      </div>

      {isCreateModalOpen && (
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
      )}

      {isFeedbackModalOpen && (
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
      )}
    </div>
  )
}
