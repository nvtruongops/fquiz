'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/shared/ui/button'
import { Skeleton } from '@/components/shared/ui/skeleton'
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react'

import { useAIHistory, AILearningLogItem } from '@/hooks/useAIHistory'
import { AIHistoryHeader } from '@/components/ai/history/AIHistoryHeader'
import { AIHistoryFilterBar } from '@/components/ai/history/AIHistoryFilterBar'
import { AIHistoryItemCard } from '@/components/ai/history/AIHistoryItemCard'

const AIAssetPreviewModal = dynamic(() => import('@/components/ai/history/AIAssetPreviewModal'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false,
})

export default function AILearningHistoryPage() {
  const {
    page, setPage,
    typeFilter, setTypeFilter,
    search, setSearch,
    selectedLog, setSelectedLog,
    logContent,
    logParams,
    userSubmission,
    evalResult,
    writingSourceText,
    writingScore,
    showParagraphTranslation, setShowParagraphTranslation,
    showStoryTranslation, setShowStoryTranslation,
    flashcardIndex, setFlashcardIndex,
    isFlipped, setIsFlipped,
    showHint, setShowHint,
    deletingLogId, setDeletingLogId,
    writingModalSubTab, setWritingModalSubTab,
    data,
    isLoading,
    isError,
    deleteMutation,
  } = useAIHistory()

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 min-h-screen">
      {/* Header */}
      <AIHistoryHeader totalCount={data?.total} />

      {/* Filter Bar */}
      <AIHistoryFilterBar
        search={search}
        setSearch={setSearch}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        setPage={setPage}
      />

      {/* Content List / Skeletons */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
          <Loader2 className="w-8 h-8 text-[#5D7B6F] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-400">Đang tải lịch sử học tập AI...</p>
        </div>
      ) : isError ? (
        <div className="bg-rose-50 p-8 rounded-3xl border border-rose-200 text-center space-y-2">
          <p className="text-xs font-bold text-rose-700">Không thể kết nối máy chủ để tải lịch sử.</p>
        </div>
      ) : data?.history?.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#5D7B6F] flex items-center justify-center mx-auto border border-emerald-100">
            <Sparkles className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-slate-800">Chưa có lịch sử học AI nào</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || typeFilter !== 'all'
              ? 'Thử thay đổi từ khóa hoặc bộ lọc tìm kiếm.'
              : 'Hãy sử dụng Vocab Studio, Grammar, Luyện viết để AI tạo bài học đầu tiên!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.history.map((item: AILearningLogItem) => (
            <AIHistoryItemCard
              key={item._id}
              item={item}
              onSelect={(log) => setSelectedLog(log)}
              onDelete={(id) => {
                setDeletingLogId(id)
                deleteMutation.mutate(id, { onSettled: () => setDeletingLogId(null) })
              }}
              isDeleting={deletingLogId === item._id || (deleteMutation.isPending && deleteMutation.variables === item._id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.totalPages && data.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold border-slate-200"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Trang trước
          </Button>
          <span className="text-xs font-bold text-slate-600">
            Trang {page} / {data.totalPages}
          </span>
          <Button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold border-slate-200"
          >
            Trang sau <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      ) : null}

      {/* Preview Modal */}
      {selectedLog && (
        <AIAssetPreviewModal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          selectedLog={selectedLog}
          logContent={logContent}
          logParams={logParams}
          userSubmission={userSubmission}
          evalResult={evalResult}
          writingSourceText={writingSourceText}
          writingScore={writingScore}
          showParagraphTranslation={showParagraphTranslation}
          setShowParagraphTranslation={setShowParagraphTranslation}
          showStoryTranslation={showStoryTranslation}
          setShowStoryTranslation={setShowStoryTranslation}
          flashcardIndex={flashcardIndex}
          setFlashcardIndex={setFlashcardIndex}
          isFlipped={isFlipped}
          setIsFlipped={setIsFlipped}
          showHint={showHint}
          setShowHint={setShowHint}
          writingModalSubTab={writingModalSubTab}
          setWritingModalSubTab={setWritingModalSubTab}
        />
      )}
    </div>
  )
}
