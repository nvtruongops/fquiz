'use client'

import React from 'react'
import { useMyQuizzes, Quiz } from '@/hooks/useMyQuizzes'
import { MyQuizzesHeader } from '@/components/quiz/my-quizzes/MyQuizzesHeader'
import { CategoryFilterTabs } from '@/components/quiz/my-quizzes/CategoryFilterTabs'
import { QuizSearchSortBar } from '@/components/quiz/my-quizzes/QuizSearchSortBar'
import { QuizCardItem } from '@/components/quiz/my-quizzes/QuizCardItem'
import { MyQuizzesSkeleton } from '@/components/quiz/my-quizzes/MyQuizzesSkeleton'

export default function MyQuizzesPage() {
  const {
    selectedCategoryId,
    setSelectedCategoryId,
    search,
    setSearch,
    categories,
    quizzesLoading,
    filteredQuizzes,
    savedQuizTotal,
    deleteQuizMutation,
  } = useMyQuizzes()

  if (quizzesLoading) {
    return <MyQuizzesSkeleton />
  }

  return (
    <div className="max-w-6xl mx-auto p-4 pb-24 sm:p-6 sm:pb-10 space-y-6 min-h-screen">
      {/* Header & Explore Shortcut */}
      <MyQuizzesHeader savedQuizTotal={savedQuizTotal} />

      {/* Category Tabs */}
      <CategoryFilterTabs
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
      />

      {/* Search Bar */}
      <QuizSearchSortBar
        search={search}
        setSearch={setSearch}
        savedQuizTotal={savedQuizTotal}
      />

      {/* Quiz List Grid / State */}
      {filteredQuizzes.length === 0 ? (
        <div className="bg-card p-12 rounded-3xl border border-border text-center space-y-3 shadow-xs">
          <p className="text-sm font-bold text-foreground">Chưa có bài quiz nào trong mục này</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search ? 'Thử tìm kiếm với từ khóa khác.' : 'Khám phá và lưu bộ đề từ thư viện Khám Phá để ôn tập.'}
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
            />
          ))}
        </div>
      )}
    </div>
  )
}
