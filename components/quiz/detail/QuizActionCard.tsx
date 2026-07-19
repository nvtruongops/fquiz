'use client'

import React from 'react'
import { ShieldCheck, Zap, Shuffle, AlignJustify, PlayCircle, Loader2, ChevronRight, AlertCircle, X, History } from 'lucide-react'
import { UnauthorizedView } from '@/components/shared/UnauthorizedView'
import Link from 'next/link'
import { Button } from '@/components/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select'

interface QuizActionCardProps {
  quizId: string
  selectedMode: 'immediate' | 'review' | 'flashcard'
  selectedDifficulty: 'sequential' | 'random'
  onModeChange: (mode: 'immediate' | 'review' | 'flashcard') => void
  onDifficultyChange: (difficulty: 'sequential' | 'random') => void
  onStart: () => void
  isStarting: boolean
  modeSelectOpen: boolean
  setModeSelectOpen: (open: boolean) => void
  resumeDialogOpen: boolean
  setResumeDialogOpen: (open: boolean) => void
  activeSessionInfo: any
  onContinue: () => void
  onRestart: () => void
  onCloseResumeDialog: () => void
  currentUser: any
  authRequiredDialogOpen: boolean
  setAuthRequiredDialogOpen: (open: boolean) => void
  hasHistory?: boolean
  latestSessionId?: string
}

export function QuizActionCard({
  quizId,
  selectedMode,
  selectedDifficulty,
  onModeChange,
  onDifficultyChange,
  onStart,
  isStarting,
  modeSelectOpen,
  setModeSelectOpen,
  resumeDialogOpen,
  setResumeDialogOpen,
  activeSessionInfo,
  onContinue,
  onRestart,
  onCloseResumeDialog,
  currentUser,
  authRequiredDialogOpen,
  setAuthRequiredDialogOpen,
  hasHistory,
  latestSessionId
}: QuizActionCardProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="lg:sticky lg:top-10 space-y-4">
        <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="mb-3 border-b border-gray-50 pb-2.5">
            <h3 className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#5D7B6F]">Tùy chọn học tập</h3>
            <p className="mt-0.5 text-[9px] sm:text-[10px] font-medium text-gray-400 uppercase">Cấu hình phiên làm bài của bạn</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-gray-50/60 p-2 sm:p-2.5 transition-colors hover:bg-gray-50">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md sm:rounded-lg bg-white shadow-xs text-[#5D7B6F]">
                <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-extrabold uppercase tracking-wider text-gray-900 truncate">Auto-Grading</p>
                <p className="text-[7.5px] font-bold text-gray-400 uppercase truncate">Chấm 100%</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-gray-50/60 p-2 sm:p-2.5 transition-colors hover:bg-gray-50">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md sm:rounded-lg bg-white shadow-xs text-amber-500">
                <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-extrabold uppercase tracking-wider text-gray-900 truncate">Instant Feedback</p>
                <p className="text-[7.5px] font-bold text-gray-400 uppercase truncate">Kết quả ngay</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={() => {
                if (!currentUser) {
                  setAuthRequiredDialogOpen(true)
                } else {
                  setModeSelectOpen(true)
                }
              }}
              className="group relative h-10 sm:h-12 w-full overflow-hidden rounded-xl sm:rounded-2xl bg-[#5D7B6F] font-bold uppercase tracking-[0.1em] text-white shadow-xs hover:bg-[#4a6358] transition-all text-xs cursor-pointer"
              disabled={isStarting}
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                Bắt đầu ngay
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Button>

            {hasHistory && latestSessionId && (
              <Button
                variant="outline"
                className="w-full h-9 sm:h-11 rounded-xl sm:rounded-2xl border border-slate-200 font-bold uppercase tracking-wider text-[#5D7B6F] hover:bg-[#5D7B6F]/5 hover:border-[#5D7B6F]/30 transition-all text-[10px] sm:text-[11px] cursor-pointer"
                asChild
              >
                <Link href={`/history/${quizId}/${latestSessionId}`}>
                  <History className="h-3.5 w-3.5 mr-1.5" />
                  Xem lịch sử trước đó
                </Link>
              </Button>
            )}
          </div>

          <Dialog open={modeSelectOpen} onOpenChange={setModeSelectOpen}>
            <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl sm:rounded-[32px] border-none p-0 shadow-2xl overflow-hidden bg-white">
              <div className="bg-[#5D7B6F] px-4 py-6 sm:px-8 sm:py-10 text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 hidden sm:block">
                  <PlayCircle className="w-32 h-32" />
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight mb-1 sm:mb-2">
                  Thiết lập bài thi
                </DialogTitle>
                <DialogDescription className="text-white/70 text-sm font-medium">
                  Tùy chỉnh trải nghiệm ôn tập của bạn
                </DialogDescription>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5D7B6F]">Chế độ thi</span>
                  <Select value={selectedMode} onValueChange={(v: any) => onModeChange(v)}>
                    <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold text-gray-700 focus:ring-[#5D7B6F]/20">
                      <SelectValue placeholder="Chọn chế độ" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-gray-100 p-1 shadow-xl">
                      <SelectItem value="immediate" className="rounded-xl py-3 font-bold text-gray-600 focus:bg-[#5D7B6F]/5 focus:text-[#5D7B6F]">
                        Thực hành (Xem kết quả ngay)
                      </SelectItem>
                      <SelectItem value="review" className="rounded-xl py-3 font-bold text-gray-600 focus:bg-[#5D7B6F]/5 focus:text-[#5D7B6F]">
                        Kiểm tra (Xem kết quả cuối cùng)
                      </SelectItem>
                      <SelectItem value="flashcard" className="rounded-xl py-3 font-bold text-gray-600 focus:bg-[#5D7B6F]/5 focus:text-[#5D7B6F]">
                        Flashcard (Ghi nhớ nhanh)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] font-medium text-gray-400 leading-relaxed px-1">
                    {selectedMode === 'immediate' && "• Đáp án được hiển thị ngay lập tức sau khi bạn chọn. Phù hợp để ôn tập kiến thức."}
                    {selectedMode === 'review' && "• Chỉ hiển thị kết quả sau khi hoàn thành toàn bộ bài thi. Phù hợp để đánh giá năng lực."}
                    {selectedMode === 'flashcard' && "• Chế độ lật thẻ để ghi nhớ khái niệm nhanh chóng."}
                  </p>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5D7B6F]">Thứ tự câu hỏi</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => onDifficultyChange('sequential')}
                      className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-4 transition-all ${
                        selectedDifficulty === 'sequential'
                          ? 'border-[#5D7B6F] bg-[#5D7B6F]/5 shadow-sm'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${selectedDifficulty === 'sequential' ? 'bg-[#5D7B6F] text-white' : 'bg-gray-50 text-gray-400'}`}>
                        <AlignJustify className="h-5 w-5" />
                      </div>
                      <span className={`text-[11px] font-black uppercase tracking-wider ${selectedDifficulty === 'sequential' ? 'text-[#5D7B6F]' : 'text-gray-400'}`}>Mặc định</span>
                    </button>
                    <button
                      onClick={() => onDifficultyChange('random')}
                      className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-4 transition-all ${
                        selectedDifficulty === 'random'
                          ? 'border-[#5D7B6F] bg-[#5D7B6F]/5 shadow-sm'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${selectedDifficulty === 'random' ? 'bg-[#5D7B6F] text-white' : 'bg-gray-50 text-gray-400'}`}>
                        <Shuffle className="h-5 w-5" />
                      </div>
                      <span className={`text-[11px] font-black uppercase tracking-wider ${selectedDifficulty === 'random' ? 'text-[#5D7B6F]' : 'text-gray-400'}`}>Ngẫu nhiên</span>
                    </button>
                  </div>
                </div>

                <Button 
                  onClick={onStart}
                  className="h-14 w-full rounded-2xl bg-[#5D7B6F] font-black uppercase tracking-widest text-white shadow-lg shadow-[#5D7B6F]/20 hover:bg-[#4a6358] transition-all"
                  disabled={isStarting}
                >
                  {isStarting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang chuẩn bị...
                    </div>
                  ) : 'Xác nhận & Bắt đầu'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
            <DialogContent className="max-w-md rounded-[32px] border-none p-0 shadow-2xl overflow-hidden bg-white">
              {activeSessionInfo?.mode === 'flashcard' || activeSessionInfo?.cardsUnknown > 0 ? (
                <>
                  <div className="bg-[#5D7B6F] px-8 py-8 text-white">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight mb-2">
                      Học Lật Thẻ (Flashcard)
                    </DialogTitle>
                    <DialogDescription className="text-white/80 text-xs font-medium leading-relaxed">
                      Với Quiz này ở chế độ <strong className="text-white font-bold">Học Lật Thẻ (Flashcard)</strong>, bạn vẫn còn <strong className="text-amber-200 font-bold">{activeSessionInfo?.cardsUnknown ?? activeSessionInfo?.answeredCount ?? 0}/{activeSessionInfo?.totalCards ?? activeSessionInfo?.totalQuestions ?? 0} câu chưa nhớ</strong>. Bạn có muốn học tiếp hay làm mới?
                    </DialogDescription>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="rounded-2xl bg-emerald-50/60 p-4 border border-emerald-100/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#5D7B6F]">Tiến độ thẻ chưa nhớ</span>
                        <span className="bg-emerald-600/10 text-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          {activeSessionInfo?.cardsUnknown ?? 0}/{activeSessionInfo?.totalCards ?? 0} câu chưa nhớ
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 pt-1">
                      <Button 
                        onClick={onContinue}
                        className="h-12 w-full rounded-2xl bg-[#5D7B6F] font-bold text-xs uppercase tracking-wider text-white shadow-md shadow-[#5D7B6F]/20 hover:bg-[#4a6358] transition-all"
                      >
                        Học tiếp (Ôn lại {activeSessionInfo?.cardsUnknown ?? activeSessionInfo?.answeredCount ?? 0} câu chưa nhớ)
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={onRestart}
                        className="h-12 w-full rounded-2xl border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        Làm mới (Bắt đầu từ đầu)
                      </Button>
                      <button 
                        onClick={onCloseResumeDialog}
                        className="py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors"
                      >
                        Đổi chế độ học khác
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-amber-500 px-8 py-10 text-white">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight mb-2">
                      Phát hiện phiên học cũ
                    </DialogTitle>
                    <DialogDescription className="text-white/70 text-sm font-medium">
                      Bạn đang có một phiên làm bài chưa hoàn thành
                    </DialogDescription>
                  </div>

                  <div className="p-8 space-y-6">
                    <div className="rounded-2xl bg-amber-50 p-6 border border-amber-100">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Tiến độ hiện tại</span>
                        <span className="bg-amber-600/10 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black">
                          {activeSessionInfo?.answeredCount ?? 0}/{activeSessionInfo?.totalQuestions ?? 0} CÂU
                        </span>
                      </div>
                      <div className="h-2 w-full bg-amber-200/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 transition-all duration-1000"
                          style={{ width: `${((activeSessionInfo?.answeredCount ?? 0) / (activeSessionInfo?.totalQuestions ?? 1)) * 100}%` }}
                        />
                      </div>
                      <p className="mt-4 text-[11px] font-bold text-amber-800 uppercase tracking-tight">
                        Chế độ: {activeSessionInfo?.mode === 'immediate' ? 'Thực hành' : activeSessionInfo?.mode === 'flashcard' ? 'Flashcard' : 'Kiểm tra'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <Button 
                        onClick={onContinue}
                        className="h-14 w-full rounded-2xl bg-amber-500 font-black uppercase tracking-widest text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
                      >
                        Tiếp tục làm bài
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={onRestart}
                        className="h-14 w-full rounded-2xl border-gray-100 font-black uppercase tracking-widest text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
                      >
                        Làm lại từ đầu
                      </Button>
                      <button 
                        onClick={onCloseResumeDialog}
                        className="py-2 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] hover:text-gray-400 transition-colors"
                      >
                        Đổi chế độ học khác
                      </button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={authRequiredDialogOpen} onOpenChange={setAuthRequiredDialogOpen}>
            <DialogContent className="max-w-md rounded-[40px] border-none p-0 shadow-2xl overflow-hidden bg-white">
              <div className="relative">
                <button 
                  onClick={() => setAuthRequiredDialogOpen(false)}
                  className="absolute top-6 right-6 z-50 p-2 rounded-full bg-black/5 hover:bg-black/10 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
                <DialogTitle className="sr-only">Yêu cầu đăng nhập</DialogTitle>
                <UnauthorizedView 
                  title="Bắt đầu hành trình"
                  description="Hãy đăng nhập để hệ thống có thể lưu lại kết quả, thống kê tiến độ và giúp bạn ôn tập hiệu quả nhất."
                  className="border-none shadow-none rounded-none p-12"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
