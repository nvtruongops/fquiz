'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/shared/ui/dialog'
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/shared/ui/dropdown-menu'
import { 
  Users, GraduationCap, Plus, BookOpen, Clock, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowRight, MoreVertical, Pin, PinOff, LogOut, Loader2, Sparkles, Calendar, ShieldCheck
} from 'lucide-react'
import { motion } from 'framer-motion'
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

  const completedAssignmentsCount = assignments.filter((a) => a.my_progress?.status === 'completed').length
  const pendingAssignmentsCount = assignments.length - completedAssignmentsCount

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background relative overflow-hidden px-4 sm:px-6 md:px-10 pt-4 pb-12">
      {/* Background Mesh Ambient */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 transform-gpu">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-primary/5 to-transparent blur-3xl opacity-50 transform-gpu" />
      </div>

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card backdrop-blur-xl p-6 sm:p-7 rounded-3xl border border-border shadow-xs"
        >
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-wider border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" /> Lớp học & Giảng dạy
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
              <GraduationCap className="w-7 h-7 text-primary" />
              Lớp học & Bài tập của tôi
            </h1>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-xl">
              Quản lý danh sách lớp học đã tham gia, theo dõi thời hạn bài tập và rèn luyện kiến thức trực tiếp từ giảng viên.
            </p>
          </div>

          <Button 
            onClick={() => setJoinModalOpen(true)} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider gap-2 rounded-2xl h-12 px-6 transition-all cursor-pointer shrink-0 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Tham gia Lớp học mới
          </Button>
        </motion.div>

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-success-bg/20 text-success-fg rounded-2xl border border-success-fg/30 flex items-center gap-3 shadow-2xs text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-success-fg shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {loading ? (
          <div className="py-20 text-center text-muted-foreground font-semibold">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-primary" />
            <p className="text-xs mt-2 font-bold text-muted-foreground">Đang tải thông tin lớp học...</p>
          </div>
        ) : classrooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-16 text-center border-2 border-dashed border-border rounded-3xl bg-card backdrop-blur-md p-8 space-y-4 shadow-xs"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-foreground">Bạn chưa tham gia lớp học nào</h3>
              <p className="text-xs font-medium text-muted-foreground max-w-md mx-auto leading-relaxed">
                Nhập Mã gia nhập (gồm 6 ký tự) do Giáo viên cấp để bắt đầu xem danh sách bài tập và tương tác trong lớp.
              </p>
            </div>
            <Button
              onClick={() => setJoinModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider rounded-2xl px-6 h-11 cursor-pointer shadow-sm"
            >
              Nhập Mã Gia Nhập Ngay
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Panel: Classrooms list */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Lớp đã tham gia ({classrooms.length})
                </h2>
              </div>

              <div className="space-y-2.5">
                {classrooms.map((c: Classroom) => {
                  const isSelected = selectedClassroom?._id === c._id
                  return (
                    <Card
                      key={c._id}
                      onClick={() => setSelectedClassroom(c)}
                      className={`cursor-pointer transition-all duration-300 border rounded-2xl overflow-hidden relative group p-4 ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/10 shadow-sm'
                          : 'border-border bg-card hover:border-primary/50 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                          }`}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {c.is_pinned && <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />}
                              <CardTitle className="text-sm font-extrabold text-slate-900 truncate" title={c.name}>
                                {c.name}
                              </CardTitle>
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                              Mã lớp: <span className="text-slate-600 font-mono">{c.code}</span>
                            </p>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 p-1.5 border-slate-200/80 rounded-2xl shadow-xl z-50 bg-white">
                            <DropdownMenuItem onClick={(e) => handleTogglePin(c, e)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold cursor-pointer text-slate-700">
                              {c.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                              <span className="text-xs">{c.is_pinned ? 'Bỏ ghim lớp' : 'Ghim lớp lên đầu'}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setConfirmLeaveId(c._id)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-rose-600 cursor-pointer">
                              <LogOut className="w-4 h-4 text-rose-600" />
                              <span className="text-xs">Rời khỏi lớp</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Right Panel: Assignments for selected classroom */}
            <div className="lg:col-span-2 space-y-3.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#5D7B6F]" /> 
                  Danh sách Bài tập: <span className="text-[#5D7B6F] font-bold">{selectedClassroom?.name ?? 'Tất cả'}</span> ({assignments.length})
                </h2>
                {assignments.length > 0 && (
                  <div className="text-[11px] font-bold text-slate-500 flex items-center gap-3">
                    <span>Đã nộp: <strong className="text-emerald-600">{completedAssignmentsCount}</strong></span>
                    <span>Chưa làm: <strong className="text-amber-600">{pendingAssignmentsCount}</strong></span>
                  </div>
                )}
              </div>

              {assignments.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-300 rounded-3xl bg-white/70 backdrop-blur-md p-8 text-slate-500 font-semibold text-xs">
                  Chưa có bài tập nào được giao trong lớp học này.
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((a: Assignment) => {
                    const progress = a.my_progress
                    const isCompleted = progress?.status === 'completed'
                    const dueAtFormatted = a.due_at ? new Date(a.due_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

                    return (
                      <Card key={a._id} className="border border-slate-200/80 p-5 rounded-2xl bg-white/90 backdrop-blur-md shadow-2xs hover:shadow-md transition-all duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">{a.title}</h3>
                            </div>
                            {a.description && <p className="text-xs text-slate-500 leading-relaxed">{a.description}</p>}
                            {dueAtFormatted && (
                              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 pt-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>Hạn nộp: <strong className="text-slate-600">{dueAtFormatted}</strong></span>
                              </div>
                            )}
                          </div>

                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0 self-start">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã nộp ({progress.best_score}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200/80 shrink-0 self-start">
                              <Clock className="w-3.5 h-3.5 text-amber-600" /> Chưa làm
                            </span>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-500 font-bold">
                            Quy mô: <strong className="text-slate-800">{a.quiz?.questionCount ?? 0} câu hỏi</strong>
                          </span>
                          <Link href={`/quiz/${a.quiz_id}?assignment_id=${a._id}&classroom_id=${a.classroom_id}`}>
                            <Button size="sm" className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl px-4 gap-1.5 cursor-pointer shadow-2xs active:scale-[0.98]">
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
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#5D7B6F]" /> Tham gia Lớp học
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Nhập mã gia nhập gồm 6 ký tự và mật khẩu lớp (nếu có) do Giáo viên cấp.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleJoinClass} className="space-y-4 pt-2">
              {errorMessage && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Mã Lớp học (6 ký tự) (*)
                </label>
                <Input
                  placeholder="ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="font-mono text-center text-2xl tracking-[0.3em] uppercase font-black rounded-2xl h-12 border-slate-200 focus:border-[#5D7B6F] focus:ring-2 focus:ring-[#5D7B6F]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Mật khẩu Lớp học (Nếu có)
                </label>
                <div className="relative">
                  <Input
                    type={showJoinPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu lớp học..."
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    className="rounded-xl text-xs pr-10 h-10 border-slate-200 focus:border-[#5D7B6F]"
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

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setJoinModalOpen(false)} className="rounded-xl text-xs font-bold">
                  Hủy
                </Button>
                <Button type="submit" disabled={joining} className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer">
                  {joining ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  {joining ? 'Đang gia nhập...' : 'Tham gia Lớp'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Leave Classroom Confirm Dialog */}
        <Dialog open={!!confirmLeaveId} onOpenChange={(open) => !open && setConfirmLeaveId(null)}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-black text-slate-900">Xác nhận rời khỏi lớp</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Bạn có chắc chắn muốn rời khỏi lớp học này không? Mọi bài tập trong lớp sẽ bị bỏ theo dõi.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 pt-3">
              <Button type="button" variant="outline" onClick={() => setConfirmLeaveId(null)} className="rounded-xl text-xs font-bold">
                Hủy
              </Button>
              <Button
                type="button"
                onClick={() => confirmLeaveId && handleLeaveClass(confirmLeaveId)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Rời khỏi lớp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

