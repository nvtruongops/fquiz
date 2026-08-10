'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { useMyQuizzes, Quiz } from '@/hooks/useMyQuizzes'
import { MyQuizzesHeader } from '@/components/quiz/my-quizzes/MyQuizzesHeader'
import { CategoryFilterTabs } from '@/components/quiz/my-quizzes/CategoryFilterTabs'
import { QuizSearchSortBar } from '@/components/quiz/my-quizzes/QuizSearchSortBar'
import { QuizCardItem } from '@/components/quiz/my-quizzes/QuizCardItem'
import { MyQuizzesSkeleton } from '@/components/quiz/my-quizzes/MyQuizzesSkeleton'

const ManageCategoriesModal = dynamic(() => import('@/components/quiz/my-quizzes/ManageCategoriesModal'), {
  ssr: false,
})

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

  if (quizzesLoading) {
    return <MyQuizzesSkeleton />
  }

  return (
    <div className="max-w-6xl mx-auto p-4 pb-24 sm:p-6 sm:pb-10 space-y-6 min-h-screen">
      {/* Header & Main Navigation */}
      <MyQuizzesHeader onOpenManageCategories={() => setIsManageCategoriesOpen(true)} ownQuizTotal={ownQuizTotal} />

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
      />

      {/* Quiz List Grid / State */}
      {filteredQuizzes.length === 0 ? (
        <div className="bg-card p-12 rounded-3xl border border-border text-center space-y-3 shadow-xs">
          <p className="text-sm font-bold text-foreground">Chưa có bài quiz nào trong mục này</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
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
