'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/shared/ui/dialog'
import { 
  FileText, Plus, Search, BookOpen, Trash2, Edit3, Send, Check, AlertCircle, HelpCircle, FolderPlus, Bookmark, X, Loader2
} from 'lucide-react'

import { useTeacherQuizzes, QuizItem, CategoryItem } from '@/hooks/useTeacherQuizzes'

export default function TeacherQuizzesPage() {
  const {
    activeTab, setActiveTab,
    loadingQuizzes,
    searchQuery, setSearchQuery,
    filteredQuizzes,
    categories, loadingCategories,
    totalQuestions,
    confirmDeleteQuizId, setConfirmDeleteQuizId,
    confirmDeleteCategoryId, setConfirmDeleteCategoryId,
    createCategoryOpen, setCreateCategoryOpen,
    newCategoryName, setNewCategoryName,
    creatingCategory, categoryError,
    handleCreateCategory, handleDeleteCategory,
    assignModalOpen, setAssignModalOpen,
    selectedQuiz,
    classrooms,
    selectedClassroomId, setSelectedClassroomId,
    dueDate, setDueDate,
    assigning, assignSuccess, assignError,
    handleOpenAssignModal, handleAssignQuiz,
    handleDeleteQuiz,
  } = useTeacherQuizzes()

  return (
    <div className="space-y-8 p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              Teacher Dashboard
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-card-foreground flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Quản lý Đề thi &amp; Mã Môn học
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Tạo Mã môn học, xây dựng bộ đề trắc nghiệm và giao bài tập cho các lớp học của bạn.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setCreateCategoryOpen(true)}
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 font-bold gap-2 rounded-xl h-11 px-4 transition-all cursor-pointer"
          >
            <FolderPlus className="w-5 h-5" /> + Tạo Mã Môn học
          </Button>

          <Link href="/teacher/quizzes/new">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 font-bold gap-2 rounded-xl h-11 px-5 transition-all cursor-pointer">
              <Plus className="w-5 h-5" /> Tạo Đề thi mới
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs Selection */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('quizzes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'quizzes'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Kho Đề thi ({filteredQuizzes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Mã Môn học &amp; Danh mục ({categories.length})</span>
        </button>
      </div>

      {/* TAB 1: KHO ĐỀ THI */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4">
              <FileText className="w-6 h-6 text-primary" />
              <div>
                <span className="text-[10px] font-black uppercase text-muted-foreground block">Bộ đề do tôi tạo</span>
                <span className="text-2xl font-black text-card-foreground">{filteredQuizzes.length}</span>
              </div>
            </div>
            <div className="bg-card p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4">
              <HelpCircle className="w-6 h-6 text-success-fg" />
              <div>
                <span className="text-[10px] font-black uppercase text-muted-foreground block">Tổng câu hỏi</span>
                <span className="text-2xl font-black text-card-foreground">{totalQuestions}</span>
              </div>
            </div>
            <div className="bg-card p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4">
              <BookOpen className="w-6 h-6 text-warning-fg" />
              <div>
                <span className="text-[10px] font-black uppercase text-muted-foreground block">Mã Môn học</span>
                <span className="text-2xl font-black text-card-foreground">{categories.length}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-card p-2 rounded-2xl border border-border shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Tìm kiếm theo Tên đề thi hoặc Mã môn học..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-0 bg-transparent focus-visible:ring-0 text-sm text-card-foreground"
              />
            </div>
          </div>

          {loadingQuizzes ? (
            <div className="py-16 text-center text-muted-foreground font-semibold"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-border rounded-3xl bg-card p-8 space-y-4">
              <h3 className="text-xl font-black text-card-foreground">Chưa có bộ đề thi nào</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map((q: QuizItem) => (
                <Card key={q._id} className="border border-border shadow-xs hover:shadow-md transition-all flex flex-col justify-between rounded-2xl bg-card overflow-hidden">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">{q.course_code}</span>
                      <span className="text-xs font-bold text-muted-foreground">{q.questionCount} câu hỏi</span>
                    </div>
                    <CardTitle className="text-base font-black text-card-foreground line-clamp-2 mt-2">{q.title}</CardTitle>
                  </CardHeader>
                  <CardFooter className="p-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                    <Button onClick={() => handleOpenAssignModal(q)} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl gap-1.5 cursor-pointer"><Send className="w-3.5 h-3.5" /> Giao bài</Button>
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/quizzes/${q._id}/edit`}><Button size="sm" variant="ghost"><Edit3 className="w-3.5 h-3.5 text-muted-foreground" /></Button></Link>
                      {confirmDeleteQuizId === q._id ? (
                        <Button size="sm" onClick={() => handleDeleteQuiz(q._id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold rounded-lg cursor-pointer">Xác nhận</Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteQuizId(q._id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MÃ MÔN HỌC & DANH MỤC */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-card-foreground">Danh sách Mã Môn học ({categories.length})</h2>
            <Button onClick={() => setCreateCategoryOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl cursor-pointer">
              + Tạo Môn học mới
            </Button>
          </div>

          {loadingCategories ? (
            <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat: CategoryItem) => (
                <div key={cat._id} className="bg-card p-5 rounded-2xl border border-border shadow-xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Bookmark className="w-5 h-5 text-primary" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-black text-card-foreground truncate">{cat.name}</span>
                      <span className="text-[11px] font-semibold text-muted-foreground">{cat.ownQuizCount ?? 0} bộ đề thi</span>
                    </div>
                  </div>
                  {confirmDeleteCategoryId === cat._id ? (
                    <div className="flex items-center gap-1 bg-incorrect-bg p-1.5 rounded-xl border border-incorrect-border">
                      <Button onClick={() => handleDeleteCategory(cat._id)} size="sm" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold rounded-lg cursor-pointer">Xóa</Button>
                      <button onClick={() => setConfirmDeleteCategoryId(null)} className="p-1 text-muted-foreground hover:text-card-foreground cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteCategoryId(cat._id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Create Category (Mã môn học) */}
      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">Tạo Mã Môn học mới</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Nhập tên môn học hoặc chủ đề giảng dạy cần tạo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4 py-2">
            {categoryError && (
              <div className="p-3 bg-incorrect-bg text-destructive text-sm rounded-xl border border-incorrect-border flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <span>{categoryError}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Mã / Tên Môn học (*)</label>
              <Input
                placeholder="Nhập tên môn học hoặc chủ đề giảng dạy..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
                className="rounded-xl border-border bg-card text-card-foreground"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateCategoryOpen(false)} className="rounded-xl border-border">Hủy</Button>
              <Button type="submit" disabled={creatingCategory} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl cursor-pointer">
                {creatingCategory ? 'Đang tạo...' : 'Tạo Môn học'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Assign Quiz to Classroom */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">Giao bài tập cho Lớp học</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {selectedQuiz && `Bộ đề: ${selectedQuiz.title} (${selectedQuiz.course_code})`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignQuiz} className="space-y-4 py-2">
            {assignError && (
              <div className="p-3 bg-incorrect-bg text-destructive text-sm rounded-xl border border-incorrect-border flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <span>{assignError}</span>
              </div>
            )}
            {assignSuccess && (
              <div className="p-3 bg-success-bg text-success-fg text-sm rounded-xl border border-success-border flex items-center gap-2">
                <Check className="w-4 h-4 text-success-fg shrink-0" />
                <span>{assignSuccess}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Chọn Lớp học (*)</label>
              {classrooms.length === 0 ? (
                <div className="text-xs text-warning-fg bg-warning-bg p-3 rounded-xl border border-warning-border">
                  Bạn chưa có lớp học nào. Hãy tạo lớp học trước khi giao bài tập.
                </div>
              ) : (
                <select
                  value={selectedClassroomId}
                  onChange={(e) => setSelectedClassroomId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-card text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {classrooms.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} (Mã: {c.code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Hạn nộp (Không bắt buộc)</label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-xl border-border bg-card text-card-foreground"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAssignModalOpen(false)} className="rounded-xl border-border">Hủy</Button>
              <Button type="submit" disabled={assigning || classrooms.length === 0} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl cursor-pointer">
                {assigning ? 'Đang giao bài...' : 'Xác nhận Giao bài'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
