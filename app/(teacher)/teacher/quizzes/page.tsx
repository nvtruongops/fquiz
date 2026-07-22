'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/shared/ui/dialog'
import { 
  FileText, 
  Plus, 
  Search, 
  BookOpen, 
  Users, 
  Trash2, 
  Edit3, 
  Send, 
  Check, 
  AlertCircle,
  HelpCircle,
  FolderPlus,
  ArrowRight,
  Bookmark,
  Layers,
  X
} from 'lucide-react'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

interface QuizItem {
  _id: string
  title: string
  course_code: string
  questionCount: number
  status: 'published' | 'draft'
  created_at: string
  category_id?: { _id: string; name: string } | null
}

interface CategoryItem {
  _id: string
  name: string
  totalQuizCount?: number
  ownQuizCount?: number
  created_at?: string
}

interface Classroom {
  _id: string
  name: string
  code: string
}

export default function TeacherQuizzesPage() {
  const [activeTab, setActiveTab] = useState<'quizzes' | 'categories'>('quizzes')

  // Quizzes State
  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [loadingQuizzes, setLoadingQuizzes] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Categories / Subject Codes State
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  // Inline Delete Confirm States
  const [confirmDeleteQuizId, setConfirmDeleteQuizId] = useState<string | null>(null)
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null)

  // Create Category Modal
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState('')

  // Assign to Classroom Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState<QuizItem | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroomId, setSelectedClassroomId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState('')
  const [assignError, setAssignError] = useState('')

  const fetchQuizzes = async () => {
    try {
      setLoadingQuizzes(true)
      const res = await fetch('/api/student/quizzes')
      const data = await res.json()
      if (res.ok) {
        setQuizzes(data.quizzes || [])
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đề thi:', err)
    } finally {
      setLoadingQuizzes(false)
    }
  }

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true)
      const res = await fetch('/api/student/categories')
      const data = await res.json()
      if (res.ok) {
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Lỗi tải danh sách môn học:', err)
    } finally {
      setLoadingCategories(false)
    }
  }

  const fetchClassrooms = async () => {
    try {
      const res = await fetch('/api/teacher/classrooms')
      const data = await res.json()
      if (res.ok) {
        setClassrooms(data.classrooms || [])
        if (data.classrooms?.length > 0) {
          setSelectedClassroomId(data.classrooms[0]._id)
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh sách lớp học:', err)
    }
  }

  useEffect(() => {
    fetchQuizzes()
    fetchCategories()
    fetchClassrooms()
  }, [])

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) {
      setCategoryError('Vui lòng nhập Mã/Tên môn học')
      return
    }

    try {
      setCreatingCategory(true)
      setCategoryError('')

      const res = await fetch('/api/student/categories', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Tạo Mã môn học thất bại')
      }

      setNewCategoryName('')
      setCreateCategoryOpen(false)
      fetchCategories()
    } catch (err: any) {
      setCategoryError(err.message || 'Lỗi khi tạo Mã môn học')
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleDeleteCategory = async (catId: string) => {
    try {
      const res = await fetch(`/api/student/categories?id=${catId}`, {
        method: 'DELETE',
        headers: withCsrfHeaders(),
      })
      const data = await res.json()
      if (res.ok) {
        setConfirmDeleteCategoryId(null)
        fetchCategories()
      } else {
        alert(data.error || 'Không thể xóa mã môn học')
      }
    } catch (err) {
      console.error('Lỗi khi xóa môn học:', err)
    }
  }

  const handleOpenAssignModal = (quiz: QuizItem) => {
    setSelectedQuiz(quiz)
    setAssignSuccess('')
    setAssignError('')
    setAssignModalOpen(true)
  }

  const handleAssignQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedQuiz || !selectedClassroomId) {
      setAssignError('Vui lòng chọn lớp học để giao bài')
      return
    }

    try {
      setAssigning(true)
      setAssignError('')
      setAssignSuccess('')

      const res = await fetch(`/api/teacher/classrooms/${selectedClassroomId}/assignments`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          quiz_id: selectedQuiz._id,
          due_at: dueDate ? new Date(dueDate).toISOString() : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Giao bài tập thất bại')
      }

      setAssignSuccess('Đã giao bài tập thành công cho lớp học!')
      setTimeout(() => {
        setAssignModalOpen(false)
      }, 1500)
    } catch (err: any) {
      setAssignError(err.message || 'Lỗi khi giao bài tập')
    } finally {
      setAssigning(false)
    }
  }

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const res = await fetch(`/api/student/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: withCsrfHeaders(),
      })
      if (res.ok) {
        setConfirmDeleteQuizId(null)
        fetchQuizzes()
      } else {
        const data = await res.json()
        alert(data.error || 'Xóa thất bại')
      }
    } catch (err) {
      console.error('Lỗi khi xóa bộ đề:', err)
    }
  }

  const filteredQuizzes = quizzes.filter((q) => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    return (
      q.title.toLowerCase().includes(query) ||
      q.course_code.toLowerCase().includes(query)
    )
  })

  const totalQuestions = quizzes.reduce((acc, q) => acc + (q.questionCount || 0), 0)

  return (
    <div className="space-y-8">
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
            Quản lý Đề thi & Mã Môn học
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Tạo Mã môn học, xây dựng bộ đề trắc nghiệm và giao bài tập cho các lớp học của bạn.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setCreateCategoryOpen(true)}
            variant="outline"
            className="border-[#5D7B6F]/30 text-[#5D7B6F] hover:bg-[#5D7B6F]/10 font-bold gap-2 rounded-xl h-11 px-4 transition-all"
          >
            <FolderPlus className="w-5 h-5" /> + Tạo Mã Môn học
          </Button>

          <Link href="/teacher/quizzes/new">
            <Button className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white shadow-md shadow-[#5D7B6F]/20 font-bold gap-2 rounded-xl h-11 px-5 transition-all">
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
          <span>Kho Đề thi ({quizzes.length})</span>
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
          <span>Mã Môn học & Danh mục ({categories.length})</span>
        </button>
      </div>

      {/* TAB 1: KHO ĐỀ THI */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#5D7B6F]/10 text-[#5D7B6F] flex items-center justify-center font-bold shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Bộ đề thi do tôi tạo</span>
                <span className="text-2xl font-black text-slate-900">{quizzes.length}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#A4C3A2]/40 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#B0D4B8]/30 text-[#166534] flex items-center justify-center font-bold shrink-0">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Tổng câu hỏi trắc nghiệm</span>
                <span className="text-2xl font-black text-slate-900">{totalQuestions}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-200/60 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FFE082]/30 text-amber-800 flex items-center justify-center font-bold shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Mã Môn học khả dụng</span>
                <span className="text-2xl font-black text-slate-900">{categories.length}</span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Tìm kiếm theo Tên đề thi hoặc Mã môn học (VD: PRN211, ENG101)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-0 bg-transparent focus-visible:ring-0 text-sm"
              />
            </div>
          </div>

          {/* Quiz List */}
          {loadingQuizzes ? (
            <div className="py-16 text-center text-slate-500 font-semibold">Đang tải danh sách đề thi...</div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-[#A4C3A2]/60 rounded-3xl bg-white p-8 space-y-4">
              <div className="w-16 h-16 bg-[#5D7B6F]/10 text-[#5D7B6F] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {searchQuery ? 'Không tìm thấy bộ đề thi phù hợp' : 'Chưa có bộ đề thi nào'}
              </h3>
              <p className="text-sm font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? 'Vui lòng thử tìm kiếm lại với từ khóa hoặc mã môn học khác.'
                  : 'Hãy tạo bộ đề thi đầu tiên của bạn để thiết lập danh sách câu hỏi và giao bài cho học viên.'}
              </p>
              {!searchQuery && (
                <Link href="/teacher/quizzes/new">
                  <Button className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl px-6">
                    Tạo Đề thi đầu tiên
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map((q) => (
                <Card key={q._id} className="border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between rounded-2xl bg-white overflow-hidden">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-[#5D7B6F]/10 text-[#5D7B6F] border border-[#5D7B6F]/20 uppercase">
                        Môn: {q.course_code}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {q.questionCount} câu hỏi
                      </span>
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-900 mt-3 line-clamp-2">{q.title}</CardTitle>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 mt-3 pt-3">
                    <span>Tạo ngày: {new Date(q.created_at).toLocaleDateString('vi-VN')}</span>
                  </CardContent>

                  <CardFooter className="p-3 bg-[#EAE7D6]/30 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      onClick={() => handleOpenAssignModal(q)}
                      size="sm"
                      className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl flex-1 gap-1.5 text-xs"
                    >
                      <Send className="w-3.5 h-3.5" /> Giao cho Lớp
                    </Button>

                    {confirmDeleteQuizId === q._id ? (
                      <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-xl border border-rose-200">
                        <span className="text-[11px] font-bold text-rose-700 ml-1">Xóa?</span>
                        <Button
                          onClick={() => handleDeleteQuiz(q._id)}
                          size="sm"
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg h-7 px-2.5 shadow-2xs cursor-pointer"
                        >
                          Xác nhận
                        </Button>
                        <button
                          onClick={() => setConfirmDeleteQuizId(null)}
                          className="p-1 rounded-lg hover:bg-rose-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          title="Hủy"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteQuizId(q._id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa đề thi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUẢN LÝ MÃ MÔN HỌC & DANH MỤC */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h3 className="text-lg font-black text-slate-900">Danh sách Mã Môn học cá nhân</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các mã môn học (ví dụ: PRN211, ENG101) giúp phân loại đề thi và bài kiểm tra trong lớp giảng dạy.
              </p>
            </div>
            <Button
              onClick={() => setCreateCategoryOpen(true)}
              className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl px-4 text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" /> Tạo Mã Môn học mới
            </Button>
          </div>

          {loadingCategories ? (
            <div className="py-16 text-center text-slate-500 font-semibold">Đang tải danh sách môn học...</div>
          ) : categories.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-[#A4C3A2]/60 rounded-3xl bg-white p-8 space-y-4">
              <div className="w-16 h-16 bg-[#5D7B6F]/10 text-[#5D7B6F] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Chưa có Mã Môn học nào</h3>
              <p className="text-sm font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
                Tạo mã môn học đầu tiên để gán cho các bộ đề thi trắc nghiệm khi bạn biên soạn.
              </p>
              <Button
                onClick={() => setCreateCategoryOpen(true)}
                className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl px-6"
              >
                Tạo Mã Môn học đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat._id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#5D7B6F]/10 text-[#5D7B6F] flex items-center justify-center font-bold shrink-0">
                      <Bookmark className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-black text-slate-900 truncate">{cat.name}</span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {cat.ownQuizCount ?? 0} bộ đề thi
                      </span>
                    </div>
                  </div>

                  {confirmDeleteCategoryId === cat._id ? (
                    <div className="flex items-center gap-1.5 bg-rose-50 p-1.5 rounded-xl border border-rose-200 shrink-0">
                      <span className="text-[11px] font-bold text-rose-700 ml-1">Xóa môn?</span>
                      <Button
                        onClick={() => handleDeleteCategory(cat._id)}
                        size="sm"
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg h-7 px-2.5 shadow-2xs cursor-pointer"
                      >
                        Xác nhận
                      </Button>
                      <button
                        onClick={() => setConfirmDeleteCategoryId(null)}
                        className="p-1 rounded-lg hover:bg-rose-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Hủy"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteCategoryId(cat._id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                      title="Xóa mã môn học"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                placeholder="VD: PRN211 hoặc Tiếng Anh Chuyên Nành"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateCategoryOpen(false)} className="rounded-xl">
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={creatingCategory}
                className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl"
              >
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
              <Button type="button" variant="outline" onClick={() => setAssignModalOpen(false)} className="rounded-xl">
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={assigning || classrooms.length === 0}
                className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl"
              >
                {assigning ? 'Đang giao bài...' : 'Xác nhận Giao bài'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
