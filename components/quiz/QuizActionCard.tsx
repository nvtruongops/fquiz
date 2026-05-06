'use client'

import React from 'react'
import { ShieldCheck, Zap, Shuffle, AlignJustify, PlayCircle, Loader2, ChevronRight, AlertCircle, X } from 'lucide-react'
import { UnauthorizedView } from '@/components/shared/UnauthorizedView'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  setAuthRequiredDialogOpen
}: QuizActionCardProps) {
  return (
    <div className="flex flex-col gap-6 lg:col-span-4 order-2 lg:order-none">
      <div className="sticky top-10 space-y-5">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="mb-6 border-b border-gray-50 pb-5">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-[#5D7B6F]">Tùy chọn học tập</h3>
            <p className="mt-2 text-[10px] font-medium text-gray-400 uppercase">Cấu hình phiên làm bài của bạn</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 rounded-xl bg-gray-50/50 p-3 transition-colors hover:bg-gray-50">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm text-[#5D7B6F]">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-900">Auto-Grading</p>
                <p className="text-[8px] font-medium text-gray-400 uppercase">Chấm điểm tự động 100%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-gray-50/50 p-3 transition-colors hover:bg-gray-50">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm text-amber-500">
                <Zap className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-900">Instant Feedback</p>
                <p className="text-[8px] font-medium text-gray-400 uppercase">Nhận kết quả ngay sau mỗi câu</p>
              </div>
            </div>
          </div>

          <Dialog open={modeSelectOpen} onOpenChange={setModeSelectOpen}>
            <Button 
              onClick={() => {
                if (!currentUser) {
                  setAuthRequiredDialogOpen(true)
                } else {
                  setModeSelectOpen(true)
                }
              }}
              className="group relative h-16 w-full overflow-hidden rounded-2xl bg-[#5D7B6F] font-black uppercase tracking-[0.1em] text-white shadow-xl shadow-[#5D7B6F]/20 transition-all hover:scale-[1.02] active:scale-95"
              disabled={isStarting}
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isStarting ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
                Bắt đầu ngay
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Button>
            
            <DialogContent className="max-w-md rounded-[32px] border-none p-0 shadow-2xl overflow-hidden bg-white">
              <div className="bg-[#5D7B6F] px-8 py-10 text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <PlayCircle className="w-32 h-32" />
                </div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight mb-2">
                  Thiết lập bài thi
                </DialogTitle>
                <DialogDescription className="text-white/70 text-sm font-medium">
                  Tùy chỉnh trải nghiệm ôn tập của bạn
                </DialogDescription>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5D7B6F]">Chế độ thi</label>
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
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5D7B6F]">Thứ tự câu hỏi</label>
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
              <div className="bg-amber-500 px-8 py-10 text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <AlertCircle className="w-32 h-32" />
                </div>
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
