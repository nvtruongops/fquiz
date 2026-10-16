'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { FileText, BookOpen, Loader2 } from 'lucide-react'
import { useTeacherQuizzes } from '@/hooks/useTeacherQuizzes'
import { TeacherQuizzesHeader } from '@/components/teacher/quizzes/TeacherQuizzesHeader'
import { TeacherQuizStatsGrid } from '@/components/teacher/quizzes/TeacherQuizStatsGrid'
import { TeacherQuizGridCard } from '@/components/teacher/quizzes/TeacherQuizGridCard'
import { TeacherQuizFilterToolbar } from '@/components/teacher/quizzes/TeacherQuizFilterToolbar'
import { TeacherCategoryCard } from '@/components/teacher/quizzes/TeacherCategoryCard'
import { TeacherCreateCategoryModal } from '@/components/teacher/quizzes/TeacherCreateCategoryModal'
import { TeacherAssignQuizModal } from '@/components/teacher/quizzes/TeacherAssignQuizModal'

export default function TeacherQuizzesPage() {
  const tq = useTeacherQuizzes()

  return (
    <div className="space-y-8 p-8 max-w-6xl mx-auto">
      <TeacherQuizzesHeader onCreateCategoryOpen={() => tq.setCreateCategoryOpen(true)} />

      {/* Tabs Selection */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => tq.setActiveTab('quizzes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            tq.activeTab === 'quizzes'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Quiz Repository ({tq.filteredQuizzes.length})</span>
        </button>

        <button
          onClick={() => tq.setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            tq.activeTab === 'categories'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Course Codes &amp; Categories ({tq.categories.length})</span>
        </button>
      </div>

      {/* TAB 1: QUIZ REPOSITORY */}
      {tq.activeTab === 'quizzes' && (
        <div className="space-y-6">
          <TeacherQuizStatsGrid
            quizCount={tq.filteredQuizzes.length}
            totalQuestions={tq.totalQuestions}
            categoryCount={tq.categories.length}
          />

          <TeacherQuizFilterToolbar searchQuery={tq.searchQuery} onSearchChange={tq.setSearchQuery} />

          {tq.loadingQuizzes ? (
            <div className="py-16 text-center text-muted-foreground font-semibold"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          ) : tq.filteredQuizzes.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-border rounded-3xl bg-card p-8 space-y-4">
              <h3 className="text-xl font-black text-card-foreground">No quizzes found</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tq.filteredQuizzes.map((q) => (
                <TeacherQuizGridCard
                  key={q._id}
                  quiz={q}
                  isConfirmingDelete={tq.confirmDeleteQuizId === q._id}
                  onOpenAssign={tq.handleOpenAssignModal}
                  onConfirmDelete={tq.setConfirmDeleteQuizId}
                  onDelete={tq.handleDeleteQuiz}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COURSE CODES & CATEGORIES */}
      {tq.activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-card-foreground">Course Code List ({tq.categories.length})</h2>
            <Button onClick={() => tq.setCreateCategoryOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl cursor-pointer">
              + Create New Category
            </Button>
          </div>

          {tq.loadingCategories ? (
            <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tq.categories.map((cat) => (
                <TeacherCategoryCard
                  key={cat._id}
                  category={cat}
                  isConfirmingDelete={tq.confirmDeleteCategoryId === cat._id}
                  onConfirmDelete={tq.setConfirmDeleteCategoryId}
                  onDelete={tq.handleDeleteCategory}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <TeacherCreateCategoryModal
        open={tq.createCategoryOpen}
        onOpenChange={tq.setCreateCategoryOpen}
        categoryName={tq.newCategoryName}
        onCategoryNameChange={tq.setNewCategoryName}
        onSubmit={tq.handleCreateCategory}
        creating={tq.creatingCategory}
        error={tq.categoryError}
      />

      <TeacherAssignQuizModal
        open={tq.assignModalOpen}
        onOpenChange={tq.setAssignModalOpen}
        selectedQuiz={tq.selectedQuiz}
        classrooms={tq.classrooms}
        selectedClassroomId={tq.selectedClassroomId}
        onSelectClassroom={tq.setSelectedClassroomId}
        dueDate={tq.dueDate}
        onDueDateChange={tq.setDueDate}
        onSubmit={tq.handleAssignQuiz}
        assigning={tq.assigning}
        assignSuccess={tq.assignSuccess}
        assignError={tq.assignError}
      />
    </div>
  )
}
