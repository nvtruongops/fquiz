'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/shared/ui/dialog'
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/shared/ui/dropdown-menu'
import { 
  Users, GraduationCap, Plus, BookOpen, Clock, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowRight, MoreVertical, Pin, PinOff, LogOut, Loader2
} from 'lucide-react'

import { useStudentClassrooms, Classroom, Assignment } from '@/hooks/useStudentClassrooms'

export default function StudentClassroomsPage() {
  const {
    classrooms,
    selectedClassroom, setSelectedClassroom,
    assignments,
    loading,
    joinModalOpen, setJoinModalOpen,
    joinCode, setJoinCode,
    joinPassword, setJoinPassword,
    showJoinPassword, setShowJoinPassword,
    joining, errorMessage, successMessage,
    confirmLeaveId, setConfirmLeaveId,
    handleJoinClass, handleTogglePin, handleLeaveClass,
  } = useStudentClassrooms()

  return (
    <div className="space-y-8 p-8 max-w-6xl mx-auto">
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
            Lớp học &amp; Bài tập của tôi
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
        <div className="py-16 text-center text-slate-500 font-semibold"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#5D7B6F]" /></div>
      ) : classrooms.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-[#A4C3A2]/60 rounded-3xl bg-white p-8 space-y-4 shadow-xs">
          <h3 className="text-xl font-black text-slate-900">Bạn chưa tham gia lớp học nào</h3>
          <p className="text-sm font-medium text-slate-500 max-w-md mx-auto">
            Nhập Mã gia nhập do Giáo viên cung cấp (gồm 6 ký tự) để bắt đầu nhận bài tập và học tập trong lớp.
          </p>
          <Button onClick={() => setJoinModalOpen(true)} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold rounded-xl px-6 cursor-pointer">
            Nhập Mã Gia Nhập
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel: Classrooms list */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#5D7B6F]" /> Lớp đã tham gia ({classrooms.length})
            </h2>
            <div className="space-y-3">
              {classrooms.map((c: Classroom) => {
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
                          {c.is_pinned && <Pin className="w-3.5 h-3.5 fill-amber-700 text-amber-700 shrink-0" />}
                          <CardTitle className="text-base font-bold text-slate-900 truncate">{c.name}</CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button type="button" className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 p-1.5 border-slate-200/80 rounded-2xl shadow-xl z-50">
                            <DropdownMenuItem onClick={(e) => handleTogglePin(c, e)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold cursor-pointer">
                              {c.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                              <span className="text-xs">{c.is_pinned ? 'Bỏ ghim lớp' : 'Ghim lớp lên đầu'}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setConfirmLeaveId(c._id)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-rose-600 cursor-pointer">
                              <LogOut className="w-4 h-4 text-rose-600" /><span className="text-xs">Rời khỏi lớp</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Right Panel: Assignments for selected classroom */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#5D7B6F]" /> Danh sách Bài tập được giao ({assignments.length})
            </h2>
            {assignments.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-[#A4C3A2]/60 rounded-3xl bg-white p-8 text-slate-500 font-medium">
                Chưa có bài tập nào được giao trong lớp này.
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((a: Assignment) => {
                  const progress = a.my_progress
                  const isCompleted = progress?.status === 'completed'
                  return (
                    <Card key={a._id} className="border border-slate-200/80 p-5 rounded-2xl bg-white shadow-xs">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{a.title}</h3>
                          {a.description && <p className="text-xs text-slate-500 mt-1">{a.description}</p>}
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
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">Số câu: <strong>{a.quiz?.questionCount ?? 0} câu</strong></span>
                        <Link href={`/quiz/${a.quiz_id}?assignment_id=${a._id}&classroom_id=${a.classroom_id}`}>
                          <Button size="sm" className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold text-xs rounded-xl px-4 gap-1.5 cursor-pointer">
                            {isCompleted ? 'Làm lại bài' : 'Bắt đầu làm bài'} <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  )
                })}
              </div>
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

      {/* Leave Classroom Confirm Dialog */}
      <Dialog open={!!confirmLeaveId} onOpenChange={(open) => !open && setConfirmLeaveId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Xác nhận rời khỏi lớp</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Bạn có chắc chắn muốn rời khỏi lớp học này không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmLeaveId(null)} className="rounded-xl">
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => confirmLeaveId && handleLeaveClass(confirmLeaveId)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer"
            >
              Rời khỏi lớp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
