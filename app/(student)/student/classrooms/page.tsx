'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/shared/ui/card'
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
  GraduationCap, 
  Plus, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  School, 
  Eye, 
  EyeOff,
  ArrowRight,
  MoreVertical,
  Pin,
  PinOff,
  LogOut,
  X
} from 'lucide-react'

import { useSearchParams } from 'next/navigation'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

interface Classroom {
  _id: string
  name: string
  code: string
  description?: string
  student_count: number
  is_pinned?: boolean
  teacher?: {
    username: string
    avatar_url?: string
    email: string
  }
}

interface Assignment {
  _id: string
  title: string
  description?: string
  quiz_id: string
  classroom_id: string
  due_at?: string
  time_limit_minutes?: number
  pass_score_percent?: number
  quiz?: {
    title: string
    questionCount: number
  }
  my_progress?: {
    best_score: number
    status: string
    is_passed: boolean
  }
}

export default function StudentClassroomsPage() {
  const searchParams = useSearchParams()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal Join State
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [showJoinPassword, setShowJoinPassword] = useState(false)
  const [joining, setJoining] = useState(false)

  // Feedback messages & leave confirm state
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [confirmLeaveId, setConfirmLeaveId] = useState<string | null>(null)

  useEffect(() => {
    const codeParam = searchParams?.get('joinCode')
    if (codeParam && codeParam.trim().length === 6) {
      setJoinCode(codeParam.trim().toUpperCase())
      setJoinModalOpen(true)
    }
  }, [searchParams])

  const fetchClassrooms = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/student/classrooms')
      const data = await res.json()
      if (res.ok) {
        const list = data.classrooms || []
        setClassrooms(list)
        if (list.length > 0 && !selectedClassroom) {
          setSelectedClassroom(list[0])
        }
      }
    } catch (err) {
      console.error('Lỗi tải lớp học:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignments = async (classroomId: string) => {
    try {
      const res = await fetch(`/api/student/classrooms/${classroomId}/assignments`)
      const data = await res.json()
      if (res.ok) {
        setAssignments(data.assignments || [])
      }
    } catch (err) {
      console.error('Lỗi tải bài tập:', err)
    }
  }

  useEffect(() => {
    fetchClassrooms()
  }, [])

  useEffect(() => {
    if (selectedClassroom) {
      fetchAssignments(selectedClassroom._id)
    }
  }, [selectedClassroom])

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim() || joinCode.length !== 6) {
      setErrorMessage('Mã lớp học phải có đúng 6 ký tự')
      return
    }

    try {
      setJoining(true)
      setErrorMessage('')
      const res = await fetch('/api/student/classrooms/join', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          code: joinCode.trim().toUpperCase(),
          password: joinPassword.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gia nhập lớp học thất bại')
      }

      setSuccessMessage(data.message || 'Gia nhập lớp thành công')
      setJoinCode('')
      setJoinPassword('')
      setJoinModalOpen(false)
      fetchClassrooms()
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi gia nhập lớp')
    } finally {
      setJoining(false)
    }
  }

  const handleTogglePin = async (c: Classroom, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/student/classrooms/${c._id}/pin`, {
        method: 'POST',
        headers: withCsrfHeaders(),
      })
      if (res.ok) {
        fetchClassrooms()
      }
    } catch (err) {
      console.error('Lỗi ghim lớp:', err)
    }
  }

  const handleLeaveClass = async (classroomId: string) => {
    try {
      const res = await fetch(`/api/student/classrooms/${classroomId}/leave`, {
        method: 'POST',
        headers: withCsrfHeaders(),
      })
      if (res.ok) {
        setConfirmLeaveId(null)
        if (selectedClassroom?._id === classroomId) {
          setSelectedClassroom(null)
        }
        fetchClassrooms()
      } else {
        const data = await res.json()
        alert(data.error || 'Rời lớp học thất bại')
      }
    } catch (err) {
      console.error('Lỗi rời lớp học:', err)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#5D7B6F] bg-[#5D7B6F]/10 px-2.5 py-1 rounded-full border border-[#5D7B6F]/20">
              Student Dashboard
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-[#5D7B6F]" />
            Lớp học & Bài tập của tôi
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Tham gia lớp học bằng mã gia nhập từ Giáo viên và hoàn thành bài tập trắc nghiệm được giao.
          </p>
        </div>
        <Button 
          onClick={() => setJoinModalOpen(true)} 
          className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white shadow-md shadow-[#5D7B6F]/20 font-bold gap-2 rounded-xl h-11 px-5 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" /> Tham gia Lớp học mới
        </Button>
      </div>

      {successMessage && (
        <div className="p-4 bg-[#B0D4B8]/40 text-[#166534] rounded-2xl border border-[#A4C3A2]/60 flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-[#166534] shrink-0" />
          <span className="font-bold text-sm">{successMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-500 font-semibold">Đang tải danh sách lớp học...</div>
      ) : classrooms.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-[#A4C3A2]/60 rounded-3xl bg-white p-8 space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-[#5D7B6F]/10 text-[#5D7B6F] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <School className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900">Bạn chưa tham gia lớp học nào</h3>
          <p className="text-sm font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
            Nhập Mã gia nhập do Giáo viên cung cấp (gồm 6 ký tự) để bắt đầu nhận bài tập và học tập trong lớp.
          </p>
          <Button onClick={() => setJoinModalOpen(true)} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl px-6 cursor-pointer">
            Nhập Mã Gia Nhập
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel: List of Joined Classrooms */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#5D7B6F]" /> Lớp đã tham gia ({classrooms.length})
            </h2>
            <div className="space-y-3">
              {classrooms.map((c) => {
                const isSelected = selectedClassroom?._id === c._id
                return (
                  <Card
                    key={c._id}
                    onClick={() => setSelectedClassroom(c)}
                    className={`cursor-pointer transition-all border rounded-2xl overflow-hidden ${
                      isSelected
                        ? 'border-[#5D7B6F] ring-2 ring-[#5D7B6F]/20 bg-[#5D7B6F]/5 shadow-xs'
                        : 'border-slate-200/80 bg-white hover:border-[#A4C3A2]'
                    }`}
                  >
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {c.is_pinned && (
                            <span className="p-1 bg-amber-100 text-amber-800 rounded-lg shrink-0" title="Lớp đã ghim">
                              <Pin className="w-3.5 h-3.5 fill-amber-700" />
                            </span>
                          )}
                          <CardTitle className="text-base font-bold text-slate-900 leading-snug truncate">{c.name}</CardTitle>
                        </div>

                        {/* 3-Dots Menu */}
                        <div className="flex items-center gap-1 shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors outline-none focus:outline-none cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 p-1.5 border-slate-200/80 rounded-2xl shadow-xl z-50">
                              <DropdownMenuItem onClick={(e) => handleTogglePin(c, e)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-slate-700 hover:text-[#5D7B6F] cursor-pointer">
                                {c.is_pinned ? <PinOff className="w-4 h-4 text-amber-600" /> : <Pin className="w-4 h-4 text-[#5D7B6F]" />}
                                <span className="text-xs">{c.is_pinned ? 'Bỏ ghim lớp' : 'Ghim lên đầu'}</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setConfirmLeaveId(c._id) }} className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer">
                                <LogOut className="w-4 h-4 text-rose-600" />
                                <span className="text-xs">Rời khỏi lớp</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {confirmLeaveId === c._id ? (
                        <div onClick={(e) => e.stopPropagation()} className="mt-3 flex items-center justify-between bg-rose-50 p-2 rounded-xl border border-rose-200">
                          <span className="text-xs font-bold text-rose-700">Rời khỏi lớp này?</span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              onClick={() => handleLeaveClass(c._id)}
                              size="sm"
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg h-7 px-2.5 cursor-pointer"
                            >
                              Xác nhận
                            </Button>
                            <button
                              onClick={() => setConfirmLeaveId(null)}
                              className="p-1 rounded-lg hover:bg-rose-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <CardDescription className="text-xs text-slate-500 flex items-center justify-between mt-2 font-medium">
                          <span>GV: <strong className="text-slate-700">{c.teacher?.username || 'Giáo viên'}</strong></span>
                          <span className="font-mono bg-white border border-[#5D7B6F]/30 px-2 py-0.5 rounded-lg text-[#5D7B6F] font-bold text-[11px]">
                            Mã: {c.code}
                          </span>
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Right Panel: Selected Classroom Detail & Assignments */}
          <div className="lg:col-span-2 space-y-6">
            {selectedClassroom && (
              <>
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#5D7B6F] bg-[#5D7B6F]/10 px-2.5 py-0.5 rounded-full border border-[#5D7B6F]/20">
                        Lớp học hiện tại
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">{selectedClassroom.name}</h2>
                    {selectedClassroom.description && (
                      <p className="text-slate-500 text-sm font-medium">{selectedClassroom.description}</p>
                    )}
                  </div>
                  <div className="text-right text-xs bg-[#F9F9F7] p-3 rounded-2xl border border-slate-200/60 shrink-0">
                    <div className="text-slate-500 font-medium">Giảng viên: <strong className="text-slate-900">{selectedClassroom.teacher?.username}</strong></div>
                    <div className="text-slate-500 font-medium mt-0.5">Sĩ số: <strong className="text-slate-900">{selectedClassroom.student_count} học viên</strong></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#5D7B6F]" /> Bài tập Quiz được giao ({assignments.length})
                  </h3>

                  {assignments.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-[#A4C3A2]/60 rounded-3xl bg-white p-8 text-slate-500 font-medium">
                      Chưa có bài tập nào được giao trong lớp này.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assignments.map((a) => {
                        const progress = a.my_progress
                        const isCompleted = progress?.status === 'completed'
                        return (
                          <Card key={a._id} className="border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white overflow-hidden">
                            <CardHeader className="p-5 pb-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="space-y-1">
                                <CardTitle className="text-lg font-bold text-slate-900">
                                  {a.title}
                                </CardTitle>
                                {a.description && (
                                  <CardDescription className="text-xs font-medium text-slate-500">
                                    {a.description}
                                  </CardDescription>
                                )}
                              </div>
                              {isCompleted ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#B0D4B8]/30 text-[#166534] border border-[#A4C3A2]/40 shrink-0">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#166534]" /> Đã nộp ({progress.best_score}%)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFE082]/30 text-amber-800 border border-amber-200 shrink-0">
                                  <Clock className="w-3.5 h-3.5 text-amber-700" /> Chưa làm
                                </span>
                              )}
                            </CardHeader>

                            <CardContent className="p-5 pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 mt-3 pt-3">
                              <div className="text-xs text-slate-500 font-medium space-y-1">
                                <div>Số câu hỏi: <strong className="text-slate-800">{a.quiz?.questionCount ?? 0} câu</strong></div>
                                {a.due_at && (
                                  <div>Hạn nộp: <strong className="text-amber-800">{new Date(a.due_at).toLocaleString('vi-VN')}</strong></div>
                                )}
                              </div>

                              <Link href={`/quiz/${a.quiz_id}?assignment_id=${a._id}&classroom_id=${a.classroom_id}`}>
                                <Button className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl px-5 h-10 w-full md:w-auto gap-2 shadow-xs cursor-pointer">
                                  {isCompleted ? 'Làm lại bài' : 'Bắt đầu làm bài'}
                                  <ArrowRight className="w-4 h-4" />
                                </Button>
                              </Link>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Join Code Modal */}
      <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Tham gia Lớp học</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Nhập mã gia nhập gồm 6 ký tự và mật khẩu lớp (nếu có) do Giáo viên cấp.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJoinClass} className="space-y-4 py-2">
            {errorMessage && (
              <div className="p-3 bg-[#FEE2E2] text-[#991B1B] text-sm rounded-xl border border-[#EF5350] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#991B1B] shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Mã Lớp học (6 ký tự) (*)</label>
              <Input
                placeholder="ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono text-center text-xl tracking-widest uppercase font-black rounded-xl border-slate-200 focus:border-[#5D7B6F]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Mật khẩu Lớp học (Nếu có)</label>
              <div className="relative">
                <Input
                  type={showJoinPassword ? 'text' : 'password'}
                  placeholder="Mật khẩu (nếu có)"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="rounded-xl text-sm pr-10 border-slate-200 focus:border-[#5D7B6F]"
                />
                <button
                  type="button"
                  onClick={() => setShowJoinPassword(!showJoinPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showJoinPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showJoinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setJoinModalOpen(false)} className="rounded-xl">
                Hủy
              </Button>
              <Button type="submit" disabled={joining} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl cursor-pointer">
                {joining ? 'Đang gia nhập...' : 'Tham gia Lớp'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
