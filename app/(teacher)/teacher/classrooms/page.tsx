'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/shared/ui/dialog'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/shared/ui/dropdown-menu'
import { 
  Users, 
  School, 
  Plus, 
  BookOpen, 
  Copy, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  FileText, 
  Eye, 
  EyeOff,
  MoreVertical,
  Key,
  Share2,
  Trash2,
  X
} from 'lucide-react'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

interface Classroom {
  _id: string
  name: string
  code: string
  password?: string | null
  description?: string
  student_count: number
  created_at: string
}

export default function TeacherClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [totalQuizzes, setTotalQuizzes] = useState(0)
  const [loading, setLoading] = useState(true)
  
  // Create Classroom Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [creating, setCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Edit Password Modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [selectedClassroomForPass, setSelectedClassroomForPass] = useState<Classroom | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [updatingPass, setUpdatingPass] = useState(false)
  const [passMessage, setPassMessage] = useState('')

  // Share Modal state
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedClassroomForShare, setSelectedClassroomForShare] = useState<Classroom | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  // Inline Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const fetchClassrooms = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/teacher/classrooms')
      const data = await res.json()
      if (res.ok) {
        setClassrooms(data.classrooms || [])
        setTotalQuizzes(data.totalQuizzes || 0)
      }
    } catch (err) {
      console.error('Lỗi tải danh sách lớp:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClassrooms()
  }, [])

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên lớp học')
      return
    }

    try {
      setCreating(true)
      setErrorMessage('')
      const res = await fetch('/api/teacher/classrooms', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name, description, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Tạo lớp học thất bại')
      }

      setName('')
      setDescription('')
      setPassword('')
      setCreateModalOpen(false)
      fetchClassrooms()
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi hệ thống')
    } finally {
      setCreating(false)
    }
  }

  const handleOpenPasswordModal = (c: Classroom) => {
    setSelectedClassroomForPass(c)
    setNewPassword(c.password || '')
    setPassMessage('')
    setPasswordModalOpen(true)
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassroomForPass) return

    try {
      setUpdatingPass(true)
      setPassMessage('')
      const res = await fetch(`/api/teacher/classrooms/${selectedClassroomForPass._id}`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Cập nhật mật khẩu thất bại')
      }

      setPassMessage('Đã cập nhật mật khẩu lớp học thành công!')
      setTimeout(() => {
        setPasswordModalOpen(false)
        fetchClassrooms()
      }, 1200)
    } catch (err: any) {
      setPassMessage(err.message || 'Lỗi khi cập nhật mật khẩu')
    } finally {
      setUpdatingPass(false)
    }
  }

  const handleOpenShareModal = (c: Classroom) => {
    setSelectedClassroomForShare(c)
    setShareCopied(false)
    setShareModalOpen(true)
  }

  const getShareUrl = (c: Classroom) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '')
    return `${origin}/student/classrooms?joinCode=${c.code}`
  }

  const handleCopyShareUrl = (c: Classroom) => {
    const url = getShareUrl(c)
    navigator.clipboard.writeText(url)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  const handleDeleteClassroom = async (classroomId: string) => {
    try {
      const res = await fetch(`/api/teacher/classrooms/${classroomId}`, {
        method: 'DELETE',
        headers: withCsrfHeaders(),
      })
      if (res.ok) {
        setConfirmDeleteId(null)
        fetchClassrooms()
      } else {
        const data = await res.json()
        alert(data.error || 'Xóa lớp học thất bại')
      }
    } catch (err) {
      console.error('Lỗi khi xóa lớp học:', err)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const totalStudents = classrooms.reduce((acc, c) => acc + (c.student_count || 0), 0)

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
            <School className="w-8 h-8 text-[#5D7B6F]" />
            Quản lý Lớp học & Giảng dạy
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Tạo và quản lý lớp học, cấp mã gia nhập cho học viên và giao bài tập trắc nghiệm từ kho đề FQuiz.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/teacher/quizzes">
            <Button variant="outline" className="border-[#5D7B6F]/30 text-[#5D7B6F] hover:bg-[#5D7B6F]/10 font-bold gap-2 rounded-xl h-11 px-4 transition-all">
              <FileText className="w-5 h-5" /> Quản lý Đề thi
            </Button>
          </Link>
          <Button onClick={() => setCreateModalOpen(true)} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white shadow-md shadow-[#5D7B6F]/20 font-bold gap-2 rounded-xl h-11 px-5 transition-all">
            <Plus className="w-5 h-5" /> Tạo Lớp học mới
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#5D7B6F]/10 text-[#5D7B6F] flex items-center justify-center font-bold shrink-0">
            <School className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Lớp học hoạt động</span>
            <span className="text-2xl font-black text-slate-900">{classrooms.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#A4C3A2]/40 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#B0D4B8]/30 text-[#166534] flex items-center justify-center font-bold shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Tổng số Học viên</span>
            <span className="text-2xl font-black text-slate-900">{totalStudents}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FFE082]/30 text-amber-800 flex items-center justify-center font-bold shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Đề thi do tôi tạo</span>
            <span className="text-2xl font-black text-slate-900">{totalQuizzes}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#A4C3A2]/20 text-[#5D7B6F] flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Trạng thái giảng dạy</span>
            <span className="text-xs font-black text-[#166534] bg-[#B0D4B8]/30 px-2 py-0.5 rounded-full border border-[#A4C3A2]/40">
              Sẵn sàng
            </span>
          </div>
        </div>
      </div>

      {/* Classroom List Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 font-semibold">Đang tải danh sách lớp học...</div>
      ) : classrooms.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-[#A4C3A2]/60 rounded-3xl bg-white p-8 space-y-4">
          <div className="w-16 h-16 bg-[#5D7B6F]/10 text-[#5D7B6F] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <School className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900">Chưa có lớp học nào</h3>
          <p className="text-sm font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
            Hãy tạo lớp học đầu tiên của bạn để sinh Mã gia nhập (Join Code) và giao bài tập trắc nghiệm.
          </p>
          <Button onClick={() => setCreateModalOpen(true)} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl px-6">
            Tạo Lớp học đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map((c) => (
            <Card key={c._id} className="border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between rounded-2xl bg-white overflow-hidden">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <CardTitle className="text-lg font-bold text-slate-900 truncate">{c.name}</CardTitle>
                    {c.description && <CardDescription className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</CardDescription>}
                  </div>

                  {/* 3-Dots Dropdown Options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 outline-none focus:outline-none cursor-pointer"
                        title="Tùy chọn cấu hình"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 p-1.5 border-slate-200/80 rounded-2xl shadow-xl z-50">
                      <DropdownMenuItem onClick={() => handleOpenPasswordModal(c)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-slate-700 hover:text-[#5D7B6F] cursor-pointer">
                        <Key className="w-4 h-4 text-[#5D7B6F]" />
                        <span className="text-xs">{c.password ? 'Đổi mật khẩu lớp' : 'Thêm mật khẩu lớp'}</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => handleOpenShareModal(c)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-slate-700 hover:text-[#5D7B6F] cursor-pointer">
                        <Share2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs">Chia sẻ link tham gia</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => setConfirmDeleteId(c._id)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer">
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        <span className="text-xs">Xóa lớp học</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 text-xs space-y-3">
                <div className="flex items-center justify-between bg-[#F9F9F7] p-2.5 rounded-xl border border-slate-200/60">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Mã gia nhập</span>
                    <span className="font-mono font-black text-slate-900 text-sm tracking-wider">{c.code}</span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(c.code)}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 cursor-pointer"
                    title="Sao chép mã"
                  >
                    {copiedCode === c.code ? <Check className="w-4 h-4 text-[#166534]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-slate-500 font-semibold pt-1">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#5D7B6F]" /> {c.student_count} học viên
                  </span>

                  {c.password ? (
                    <span className="text-[11px] font-bold text-amber-800 bg-[#FFE082]/30 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                      <Key className="w-3 h-3" /> Mật khẩu
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-[#166534] bg-[#B0D4B8]/30 px-2 py-0.5 rounded-full border border-[#A4C3A2]/40">
                      Tự do
                    </span>
                  )}
                </div>
              </CardContent>

              <CardFooter className="p-3 bg-[#EAE7D6]/30 border-t border-slate-100 flex items-center justify-between gap-2">
                {confirmDeleteId === c._id ? (
                  <div className="w-full flex items-center justify-between bg-rose-50 p-1.5 rounded-xl border border-rose-200">
                    <span className="text-xs font-bold text-rose-700 ml-1">Xóa lớp này?</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        onClick={() => handleDeleteClassroom(c._id)}
                        size="sm"
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg h-7 px-3 shadow-2xs cursor-pointer"
                      >
                        Xác nhận
                      </Button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 rounded-lg hover:bg-rose-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Hủy"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link href={`/teacher/classrooms/${c._id}`} className="w-full">
                    <Button variant="ghost" className="w-full text-[#5D7B6F] hover:bg-[#5D7B6F]/10 font-bold gap-1.5 text-xs justify-between rounded-xl">
                      Chi tiết Lớp học <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Modal 1: Create Classroom Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Tạo Lớp học mới</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Tạo lớp học mới để sinh mã gia nhập tự động cho học viên của bạn.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateClassroom} className="space-y-4 py-2">
            {errorMessage && (
              <div className="p-3 bg-[#FEE2E2] text-[#991B1B] text-sm rounded-xl border border-[#EF5350] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#991B1B] shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Tên Lớp học (*)</label>
              <Input
                placeholder="Lớp Tiếng Anh B1 - K24"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Mô tả lớp học</label>
              <Input
                placeholder="Mô tả ngắn về lớp học"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Mật khẩu tham gia lớp (Không bắt buộc)</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu (Bỏ trống nếu cho phép vào tự do)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Nếu nhập mật khẩu, học viên sẽ phải nhập đúng Mật khẩu này cùng với Mã lớp để tham gia.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="rounded-xl">
                Hủy
              </Button>
              <Button type="submit" disabled={creating} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl">
                {creating ? 'Đang tạo...' : 'Tạo Lớp'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Edit Password Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Cấu hình Mật khẩu Lớp học</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {selectedClassroomForPass && `Lớp: ${selectedClassroomForPass.name} (Mã: ${selectedClassroomForPass.code})`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4 py-2">
            {passMessage && (
              <div className="p-3 bg-[#B0D4B8]/40 text-[#166534] text-sm rounded-xl border border-[#A4C3A2]/60 flex items-center gap-2">
                <Check className="w-4 h-4 text-[#166534] shrink-0" />
                <span>{passMessage}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Mật khẩu mới (Để trống để bỏ mật khẩu)</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu mới hoặc xóa trắng để bảo vệ tự do"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setPasswordModalOpen(false)} className="rounded-xl">
                Hủy
              </Button>
              <Button type="submit" disabled={updatingPass} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl">
                {updatingPass ? 'Đang lưu...' : 'Lưu Mật khẩu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Share Link Modal */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Chia sẻ Link Tham gia Lớp học</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Gửi liên kết này cho học viên. Học viên mở link sẽ tự động điền Mã lớp và nhập Mật khẩu (nếu có).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedClassroomForShare && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Liên kết trực tiếp (Share URL)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={getShareUrl(selectedClassroomForShare)}
                      className="rounded-xl text-xs bg-slate-50 font-mono"
                    />
                    <Button
                      onClick={() => handleCopyShareUrl(selectedClassroomForShare)}
                      className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl shrink-0 gap-1.5"
                    >
                      {shareCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      {shareCopied ? 'Đã sao chép' : 'Sao chép'}
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-[#EAE7D6]/40 text-slate-700 text-xs rounded-xl border border-slate-200/80 space-y-1">
                  <div className="font-bold">Thông tin lớp học:</div>
                  <div>• Lớp: <strong>{selectedClassroomForShare.name}</strong></div>
                  <div>• Mã gia nhập: <strong className="font-mono">{selectedClassroomForShare.code}</strong></div>
                  <div>• Yêu cầu mật khẩu: <strong>{selectedClassroomForShare.password ? 'Có (Cần nhập pass khi vào)' : 'Không (Vào tự do)'}</strong></div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareModalOpen(false)} className="rounded-xl">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
