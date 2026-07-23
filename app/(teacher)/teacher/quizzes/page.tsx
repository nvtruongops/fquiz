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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#5D7B6F] bg-[#5D7B6F]/10 px-2.5 py-1 rounded-full border border-[#5D7B6F]/20">
              Teacher Dashboard
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#5D7B6F]" />
            Quản lý Đề thi &amp; Mã Môn học
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Tạo Mã môn học, xây dựng bộ đề trắc nghiệm và giao bài tập cho các lớp học của bạn.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setCreateCategoryOpen(true)}
            variant="outline"
            className="border-[#5D7B6F]/30 text-[#5D7B6F] hover:bg-[#5D7B6F]/10 font-bold gap-2 rounded-xl h-11 px-4 transition-all cursor-pointer"
          >
            <FolderPlus className="w-5 h-5" /> + Tạo Mã Môn học
          </Button>

          <Link href="/teacher/quizzes/new">
            <Button className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white shadow-md shadow-[#5D7B6F]/20 font-bold gap-2 rounded-xl h-11 px-5 transition-all cursor-pointer">
              <Plus className="w-5 h-5" /> Tạo Đề thi mới
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs Selection */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => setActiveTab('quizzes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'quizzes'
              ? 'bg-[#5D7B6F] text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Kho Đề thi ({filteredQuizzes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-[#5D7B6F] text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <FileText className="w-6 h-6 text-[#5D7B6F]" />
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Bộ đề do tôi tạo</span>
                <span className="text-2xl font-black text-slate-900">{filteredQuizzes.length}</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <HelpCircle className="w-6 h-6 text-emerald-600" />
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Tổng câu hỏi</span>
                <span className="text-2xl font-black text-slate-900">{totalQuestions}</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <BookOpen className="w-6 h-6 text-amber-600" />
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Mã Môn học</span>
                <span className="text-2xl font-black text-slate-900">{categories.length}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Tìm kiếm theo Tên đề thi hoặc Mã môn học..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-0 bg-transparent focus-visible:ring-0 text-sm"
              />
            </div>
          </div>

          {loadingQuizzes ? (
            <div className="py-16 text-center text-slate-500 font-semibold"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#5D7B6F]" /></div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-[#A4C3A2]/60 rounded-3xl bg-white p-8 space-y-4">
              <h3 className="text-xl font-black text-slate-900">Chưa có bộ đề thi nào</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map((q: QuizItem) => (
                <Card key={q._id} className="border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between rounded-2xl bg-white overflow-hidden">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase text-[#5D7B6F] bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">{q.course_code}</span>
                      <span className="text-xs font-bold text-slate-400">{q.questionCount} câu hỏi</span>
                    </div>
                    <CardTitle className="text-base font-black text-slate-900 line-clamp-2 mt-2">{q.title}</CardTitle>
                  </CardHeader>
                  <CardFooter className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button onClick={() => handleOpenAssignModal(q)} size="sm" className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white text-xs font-bold rounded-xl gap-1.5 cursor-pointer"><Send className="w-3.5 h-3.5" /> Giao bài</Button>
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/quizzes/${q._id}/edit`}><Button size="sm" variant="ghost"><Edit3 className="w-3.5 h-3.5 text-slate-500" /></Button></Link>
                      {confirmDeleteQuizId === q._id ? (
                        <Button size="sm" onClick={() => handleDeleteQuiz(q._id)} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer">Xác nhận</Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteQuizId(q._id)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
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
            <h2 className="text-lg font-black text-slate-900">Danh sách Mã Môn học ({categories.length})</h2>
            <Button onClick={() => setCreateCategoryOpen(true)} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold text-xs rounded-xl cursor-pointer">
              + Tạo Môn học mới
            </Button>
          </div>

          {loadingCategories ? (
            <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#5D7B6F]" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat: CategoryItem) => (
                <div key={cat._id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Bookmark className="w-5 h-5 text-[#5D7B6F]" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-black text-slate-900 truncate">{cat.name}</span>
                      <span className="text-[11px] font-semibold text-slate-400">{cat.ownQuizCount ?? 0} bộ đề thi</span>
                    </div>
                  </div>
                  {confirmDeleteCategoryId === cat._id ? (
                    <div className="flex items-center gap-1 bg-rose-50 p-1.5 rounded-xl border border-rose-200">
                      <Button onClick={() => handleDeleteCategory(cat._id)} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer">Xóa</Button>
                      <button onClick={() => setConfirmDeleteCategoryId(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteCategoryId(cat._id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Create Category (Mã môn học) */}
      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Tạo Mã Môn học mới</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Nhập mã môn học hoặc tên môn giảng dạy (VD: PRN211, Tiếng Anh B1, Kỹ thuật lập trình Java).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4 py-2">
            {categoryError && (
              <div className="p-3 bg-[#FEE2E2] text-[#991B1B] text-sm rounded-xl border border-[#EF5350] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#991B1B] shrink-0" />
                <span>{categoryError}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Mã / Tên Môn học (*)</label>
              <Input
                placeholder="VD: PRN211 hoặc Tiếng Anh Chuyên Ngành"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateCategoryOpen(false)} className="rounded-xl">Hủy</Button>
              <Button type="submit" disabled={creatingCategory} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl cursor-pointer">
                {creatingCategory ? 'Đang tạo...' : 'Tạo Môn học'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Assign Quiz to Classroom */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Giao bài tập cho Lớp học</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {selectedQuiz && `Bộ đề: ${selectedQuiz.title} (${selectedQuiz.course_code})`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignQuiz} className="space-y-4 py-2">
            {assignError && (
              <div className="p-3 bg-[#FEE2E2] text-[#991B1B] text-sm rounded-xl border border-[#EF5350] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#991B1B] shrink-0" />
                <span>{assignError}</span>
              </div>
            )}
            {assignSuccess && (
              <div className="p-3 bg-[#B0D4B8]/40 text-[#166534] text-sm rounded-xl border border-[#A4C3A2]/60 flex items-center gap-2">
                <Check className="w-4 h-4 text-[#166534] shrink-0" />
                <span>{assignSuccess}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Chọn Lớp học (*)</label>
              {classrooms.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  Bạn chưa có lớp học nào. Hãy tạo lớp học trước khi giao bài tập.
                </div>
              ) : (
                <select
                  value={selectedClassroomId}
                  onChange={(e) => setSelectedClassroomId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D7B6F]"
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
              <label className="text-sm font-semibold text-slate-700">Hạn nộp (Không bắt buộc)</label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAssignModalOpen(false)} className="rounded-xl">Hủy</Button>
              <Button type="submit" disabled={assigning || classrooms.length === 0} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl cursor-pointer">
                {assigning ? 'Đang giao bài...' : 'Xác nhận Giao bài'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
