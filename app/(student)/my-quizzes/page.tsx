'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Skeleton } from '@/components/shared/ui/skeleton'
import { useMyQuizzes, Quiz } from '@/hooks/useMyQuizzes'
import { MyQuizzesHeader } from '@/components/quiz/my-quizzes/MyQuizzesHeader'
import { CategoryFilterTabs } from '@/components/quiz/my-quizzes/CategoryFilterTabs'
import { QuizSearchSortBar } from '@/components/quiz/my-quizzes/QuizSearchSortBar'
import { QuizCardItem } from '@/components/quiz/my-quizzes/QuizCardItem'

const ManageCategoriesModal = dynamic(() => import('@/components/quiz/my-quizzes/ManageCategoriesModal'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false,
})

function QuizCardSkeleton() {
  return (
    <Card className="w-full border border-slate-100 rounded-xl overflow-hidden bg-white shadow-xs animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-20 rounded bg-slate-100" />
            <div className="h-5 w-36 rounded bg-slate-100" />
            <div className="h-3 w-48 rounded bg-slate-100" />
          </div>
          <div className="w-28 h-10 rounded bg-slate-100" />
          <div className="h-9 w-20 rounded bg-slate-200" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function MyQuizzesPage() {
  const {
    selectedCategoryId, setSelectedCategoryId,
    activeTab, setActiveTab,
    search, setSearch,
    isManageCategoriesOpen, setIsManageCategoriesOpen,
    confirmDeleteCatId, setConfirmDeleteCatId,
    newCategoryName, setNewCategoryName,
    editingCategoryId, setEditingCategoryId,
    editingCategoryName, setEditingCategoryName,
    categories,
    privateCategories,
    quizzesLoading,
    filteredQuizzes,
    ownQuizTotal,
    savedQuizTotal,
    mixQuizTotal,
    deleteQuizMutation,
    createCatMutation,
    updateCatMutation,
    deleteCatMutation,
    moveQuizCategoryMutation,
    handleMoveCategory,
  } = useMyQuizzes()

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 min-h-screen">
      {/* Header & Main Navigation */}
      <MyQuizzesHeader onOpenManageCategories={() => setIsManageCategoriesOpen(true)} />

      {/* Category Tabs */}
      <CategoryFilterTabs
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
      />

      {/* Search & Active Tab Switcher Bar */}
      <QuizSearchSortBar
        search={search}
        setSearch={setSearch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ownQuizTotal={ownQuizTotal}
        savedQuizTotal={savedQuizTotal}
        mixQuizTotal={mixQuizTotal}
      />

      {/* Quiz List Grid / State */}
      {quizzesLoading ? (
        <div className="space-y-3">
          <QuizCardSkeleton />
          <QuizCardSkeleton />
          <QuizCardSkeleton />
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
          <p className="text-sm font-bold text-slate-700">Chưa có bài quiz nào trong mục này</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search ? 'Thử tìm kiếm với từ khóa khác.' : 'Tạo mới bộ đề cá nhân hoặc khám phá bộ đề từ thư viện Explore.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuizzes.map((quiz: Quiz) => (
            <QuizCardItem
              key={quiz._id}
              quiz={quiz}
              onDelete={(id) => deleteQuizMutation.mutate(id)}
              isDeleting={deleteQuizMutation.isPending && deleteQuizMutation.variables === quiz._id}
              categories={privateCategories}
              onMoveCategory={handleMoveCategory}
              isMovingCategory={moveQuizCategoryMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Manage Categories Modal (Code-Split) */}
      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          isOpen={isManageCategoriesOpen}
          onClose={() => setIsManageCategoriesOpen(false)}
          privateCategories={privateCategories}
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          createCatMutation={createCatMutation}
          editingCategoryId={editingCategoryId}
          setEditingCategoryId={setEditingCategoryId}
          editingCategoryName={editingCategoryName}
          setEditingCategoryName={setEditingCategoryName}
          updateCatMutation={updateCatMutation}
          confirmDeleteCatId={confirmDeleteCatId}
          setConfirmDeleteCatId={setConfirmDeleteCatId}
          deleteCatMutation={deleteCatMutation}
        />
      )}
    </div>
  )
}
