'use client'

import React from 'react'
import { ShieldCheck, Zap, Shuffle, AlignJustify, PlayCircle, Loader2, ChevronRight, AlertCircle, X, History, Sparkles, BookOpen, FileText, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
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
  authRequiredDialogOpen?: boolean
  setAuthRequiredDialogOpen?: (open: boolean) => void
  hasHistory?: boolean
  latestSessionId?: string
}

/* eslint-disable sonarjs/cognitive-complexity */
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
  const router = useRouter()
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-5 shadow-xs">
          <div className="mb-3 border-b border-border pb-2.5">
            <h3 className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.25em] text-primary">Tùy chọn học tập</h3>
            <p className="mt-0.5 text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase">Cấu hình phiên làm bài của bạn</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-muted/60 p-2 sm:p-2.5 transition-colors hover:bg-muted">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md sm:rounded-lg bg-card shadow-xs text-primary">
                <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-extrabold uppercase tracking-wider text-foreground truncate">Auto-Grading</p>
                <p className="text-[7.5px] font-bold text-muted-foreground uppercase truncate">Chấm 100%</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-muted/60 p-2 sm:p-2.5 transition-colors hover:bg-muted">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md sm:rounded-lg bg-card shadow-xs text-amber-400">
                <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-extrabold uppercase tracking-wider text-foreground truncate">Instant Feedback</p>
                <p className="text-[7.5px] font-bold text-muted-foreground uppercase truncate">Kết quả ngay</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={() => {
                if (!currentUser) {
                  const safeCallback = encodeURIComponent(`/quiz/${quizId}`)
                  router.push(`/login?callbackUrl=${safeCallback}`)
                } else {
                  setModeSelectOpen(true)
                }
              }}
              className="group relative h-10 sm:h-12 w-full overflow-hidden rounded-xl sm:rounded-2xl bg-primary font-bold uppercase tracking-[0.1em] text-primary-foreground shadow-xs hover:bg-primary/90 transition-all text-xs cursor-pointer"
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
                className="w-full h-9 sm:h-11 rounded-xl sm:rounded-2xl border border-border font-bold uppercase tracking-wider text-primary hover:bg-muted transition-all text-[10px] sm:text-[11px] cursor-pointer"
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
            <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl rounded-2xl sm:rounded-[32px] border border-border p-0 shadow-2xl overflow-hidden bg-card text-foreground">
              <div className="bg-primary px-5 py-6 sm:px-8 sm:py-8 text-primary-foreground relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 hidden sm:block pointer-events-none">
                  <PlayCircle className="w-36 h-36" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/20 font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full">
                    Phiên học cá nhân hóa
                  </Badge>
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-1.5">
                  Tùy Chọn Luyện Tập
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/80 text-xs sm:text-sm font-medium leading-relaxed max-w-md">
                  Chọn chế độ hiển thị và thứ tự câu hỏi phù hợp nhất với nhu cầu ôn tập của bạn.
                </DialogDescription>
              </div>

              <div className="p-5 sm:p-8 space-y-6">
                {/* 1. Chế độ hiển thị */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">1</span>
                      Chế độ hiển thị
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">3 chế độ ôn tập</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Mode 1: Immediate */}
                    <button
                      type="button"
                      onClick={() => onModeChange('immediate')}
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border-2 text-left transition-all cursor-pointer select-none ${
                        selectedMode === 'immediate'
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-card hover:border-ring'
                      }`}
                    >
                      {selectedMode === 'immediate' && (
                        <CheckCircle2 className="absolute top-3.5 right-3.5 w-4 h-4 text-primary" />
                      )}
                      <div className="space-y-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          selectedMode === 'immediate' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary border border-primary/20'
                        }`}>
                          <Sparkles className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-foreground leading-tight">Xem đáp án ngay</h4>
                          <p className="text-[10px] font-medium text-muted-foreground leading-relaxed mt-1">
                            Hiện lời giải & đáp án tức thì sau từng câu hỏi
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Mode 2: Review (Exam Mode) */}
                    <button
                      type="button"
                      onClick={() => onModeChange('review')}
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border-2 text-left transition-all cursor-pointer select-none ${
                        selectedMode === 'review'
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-card hover:border-ring'
                      }`}
                    >
                      {selectedMode === 'review' && (
                        <CheckCircle2 className="absolute top-3.5 right-3.5 w-4 h-4 text-primary" />
                      )}
                      <div className="space-y-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          selectedMode === 'review' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary border border-primary/20'
                        }`}>
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-foreground leading-tight">Thi thử & Kiểm tra</h4>
                          <p className="text-[10px] font-medium text-muted-foreground leading-relaxed mt-1">
                            Mô phỏng đợt thi thật, nộp bài mới chấm điểm
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Mode 3: Flashcard */}
                    <button
                      type="button"
                      onClick={() => onModeChange('flashcard')}
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border-2 text-left transition-all cursor-pointer select-none ${
                        selectedMode === 'flashcard'
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-card hover:border-ring'
                      }`}
                    >
                      {selectedMode === 'flashcard' && (
                        <CheckCircle2 className="absolute top-3.5 right-3.5 w-4 h-4 text-primary" />
                      )}
                      <div className="space-y-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          selectedMode === 'flashcard' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary border border-primary/20'
                        }`}>
                          <BookOpen className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-foreground leading-tight">Học lật thẻ</h4>
                          <p className="text-[10px] font-medium text-muted-foreground leading-relaxed mt-1">
                            Lật thẻ ghi nhớ thuật ngữ & kiến thức trọng tâm
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Thứ tự câu hỏi */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">2</span>
                      Thứ tự câu hỏi
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => onDifficultyChange('sequential')}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer select-none ${
                        selectedDifficulty === 'sequential'
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-card hover:border-ring'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        selectedDifficulty === 'sequential' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <AlignJustify className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-foreground">Thứ tự mặc định</h4>
                        <p className="text-[10px] font-medium text-muted-foreground truncate">Theo thứ tự gốc từ câu 1 đến hết</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDifficultyChange('random')}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer select-none ${
                        selectedDifficulty === 'random'
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border bg-card hover:border-ring'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        selectedDifficulty === 'random' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Shuffle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-foreground">Trộn ngẫu nhiên</h4>
                        <p className="text-[10px] font-medium text-muted-foreground truncate">Xáo trộn vị trí các câu hỏi</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Start Action CTA */}
                <Button 
                  onClick={onStart}
                  className="h-12 w-full rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-black uppercase tracking-wider text-xs shadow-md transition-all cursor-pointer active:scale-[0.99]"
                  disabled={isStarting}
                >
                  {isStarting ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang khởi tạo phiên học...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      Xác nhận & Bắt đầu làm bài
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
            <DialogContent className="max-w-md rounded-[32px] border border-border p-0 shadow-2xl overflow-hidden bg-card text-card-foreground">
              {activeSessionInfo?.mode === 'flashcard' || activeSessionInfo?.cardsUnknown > 0 ? (
                <>
                  <div className="bg-primary px-8 py-8 text-primary-foreground">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight mb-2">
                      Học Lật Thẻ (Flashcard)
                    </DialogTitle>
                    <DialogDescription className="text-primary-foreground/90 text-xs font-medium leading-relaxed">
                      Với Quiz này ở chế độ <strong className="text-primary-foreground font-bold">Học Lật Thẻ (Flashcard)</strong>, bạn vẫn còn <strong className="text-primary-foreground font-extrabold">{activeSessionInfo?.cardsUnknown ?? activeSessionInfo?.answeredCount ?? 0}/{activeSessionInfo?.totalCards ?? activeSessionInfo?.totalQuestions ?? 0} câu chưa nhớ</strong>. Bạn có muốn học tiếp hay làm mới?
                    </DialogDescription>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="rounded-2xl bg-primary/10 p-4 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Tiến độ thẻ chưa nhớ</span>
                        <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          {activeSessionInfo?.cardsUnknown ?? 0}/{activeSessionInfo?.totalCards ?? 0} câu chưa nhớ
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 pt-1">
                      <Button 
                        onClick={onContinue}
                        className="h-12 w-full rounded-2xl bg-primary hover:bg-primary-hover font-bold text-xs uppercase tracking-wider text-primary-foreground shadow-md transition-all cursor-pointer"
                      >
                        Học tiếp (Ôn lại {activeSessionInfo?.cardsUnknown ?? activeSessionInfo?.answeredCount ?? 0} câu chưa nhớ)
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={onRestart}
                        className="h-12 w-full rounded-2xl border-border bg-card font-bold text-xs uppercase tracking-wider text-foreground hover:bg-muted transition-all cursor-pointer"
                      >
                        Làm mới (Bắt đầu từ đầu)
                      </Button>
                      <button 
                        onClick={onCloseResumeDialog}
                        className="py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer"
                      >
                        Đổi chế độ học khác
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-primary px-8 py-8 text-primary-foreground">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight mb-2">
                      Phát hiện phiên học cũ
                    </DialogTitle>
                    <DialogDescription className="text-primary-foreground/90 text-xs font-medium leading-relaxed">
                      Bạn đang có một phiên làm bài chưa hoàn thành
                    </DialogDescription>
                  </div>

                  <div className="p-6 space-y-5">
                    <div className="rounded-2xl bg-primary/10 p-5 border border-primary/20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Tiến độ hiện tại</span>
                        <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black">
                          {activeSessionInfo?.answeredCount ?? 0}/{activeSessionInfo?.totalQuestions ?? 0} CÂU
                        </span>
                      </div>
                      <div className="h-2 w-full bg-primary/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-1000"
                          style={{ width: `${((activeSessionInfo?.answeredCount ?? 0) / (activeSessionInfo?.totalQuestions ?? 1)) * 100}%` }}
                        />
                      </div>
                      <p className="mt-3 text-[11px] font-bold text-foreground uppercase tracking-tight">
                        Chế độ: {activeSessionInfo?.mode === 'immediate' ? 'Thực hành' : activeSessionInfo?.mode === 'flashcard' ? 'Flashcard' : 'Kiểm tra'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      <Button 
                        onClick={onContinue}
                        className="h-12 w-full rounded-2xl bg-primary hover:bg-primary-hover font-black uppercase tracking-widest text-primary-foreground shadow-md transition-all cursor-pointer"
                      >
                        Tiếp tục làm bài
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={onRestart}
                        className="h-12 w-full rounded-2xl border-border bg-card font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all cursor-pointer"
                      >
                        Làm lại từ đầu
                      </Button>
                      <button 
                        onClick={onCloseResumeDialog}
                        className="py-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] hover:text-foreground transition-colors cursor-pointer"
                      >
                        Đổi chế độ học khác
                      </button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
