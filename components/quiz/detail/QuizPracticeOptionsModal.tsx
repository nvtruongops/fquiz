'use client'

import React, { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import {
  Sparkles,
  FileText,
  BookOpen,
  AlignJustify,
  Shuffle,
  Loader2,
  ChevronRight,
  Check,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { cn } from '@/lib/core/utils/cn'

interface QuizPracticeOptionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedMode: 'immediate' | 'review' | 'flashcard'
  onModeChange: (mode: 'immediate' | 'review' | 'flashcard') => void
  selectedDifficulty: 'sequential' | 'random'
  onDifficultyChange: (difficulty: 'sequential' | 'random') => void
  onStart: () => void
  isStarting: boolean
}

export function QuizPracticeOptionsModal({
  open,
  onOpenChange,
  selectedMode,
  onModeChange,
  selectedDifficulty,
  onDifficultyChange,
  onStart,
  isStarting,
}: QuizPracticeOptionsModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // GSAP Entrance Stagger & Micro-interactions
  useGSAP(
    () => {
      if (!open || !containerRef.current) return

      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('.gsap-modal-item', { autoAlpha: 1, y: 0 })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.gsap-modal-item',
          { autoAlpha: 0, y: 10 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.3,
            stagger: 0.04,
            ease: 'power2.out',
            clearProps: 'transform',
          }
        )
      })

      return () => mm.revert()
    },
    { scope: containerRef, dependencies: [open] }
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 w-full sm:fixed sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl rounded-t-[24px] rounded-b-none sm:rounded-[24px] border-t sm:border border-border p-0 shadow-2xl overflow-hidden bg-card text-foreground flex flex-col h-auto max-h-[88dvh] sm:max-h-[92vh] max-sm:data-[state=open]:slide-in-from-left-0 max-sm:data-[state=closed]:slide-out-to-left-0 data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-1/2 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-1/2 sm:data-[state=closed]:zoom-out-95 [&>button]:z-20 [&>button]:w-7.5 [&>button]:h-7.5 sm:[&>button]:w-8 sm:[&>button]:h-8 [&>button]:rounded-full [&>button]:bg-primary-foreground/20 [&>button:hover]:bg-primary-foreground/35 [&>button]:border [&>button]:border-primary-foreground/30 [&>button]:text-primary-foreground [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:transition-all [&>button]:duration-200 [&>button:hover]:scale-105 [&>button:active]:scale-95 [&>button]:top-3 sm:[&>button]:top-3.5 [&>button]:right-3.5 sm:[&>button]:right-4 [&>button>svg]:h-4 [&>button>svg]:w-4 [&>button>svg]:transition-transform [&>button:hover>svg]:rotate-90 z-50">
        <div ref={containerRef} className="flex flex-col h-full w-full">
          {/* Dialog Header */}
          <div className="bg-primary px-4 pt-3.5 pb-3 sm:px-5 sm:py-3.5 text-primary-foreground relative shrink-0">
            <div className="w-9 h-1 rounded-full bg-primary-foreground/35 mx-auto mb-2 sm:hidden" />
            
            <div className="flex items-center gap-2 mb-0.5 gsap-modal-item relative z-10">
              <Badge
                variant="secondary"
                className="bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/20 font-black text-[8.5px] uppercase px-2 py-0.5 rounded-full"
              >
                Phiên học cá nhân hóa
              </Badge>
            </div>
            <DialogTitle className="text-sm sm:text-base font-black uppercase tracking-tight mb-0.5 gsap-modal-item relative z-10">
              Tùy Chọn Luyện Tập
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/85 text-[10.5px] sm:text-xs font-medium leading-tight max-w-lg gsap-modal-item relative z-10">
              Chọn chế độ hiển thị và thứ tự câu hỏi phù hợp nhất với nhu cầu ôn tập của bạn.
            </DialogDescription>
          </div>

          {/* Dialog Body */}
          <div className="p-3.5 sm:p-4 space-y-3 sm:space-y-3.5 overflow-y-auto custom-scrollbar touch-pan-y flex-1 flex flex-col justify-between">
            <div className="space-y-2.5 sm:space-y-3">
              {/* 1. Chế độ hiển thị */}
              <div className="space-y-1.5 gsap-modal-item">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black">
                      1
                    </span>
                    Chế độ hiển thị
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] font-semibold text-muted-foreground">
                    3 chế độ ôn tập
                  </span>
                </div>

                {/* Mobile Select Dropdown */}
                <div className="sm:hidden">
                  <Select
                    value={selectedMode}
                    onValueChange={(val: 'immediate' | 'review' | 'flashcard') => onModeChange(val)}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl border border-border bg-muted/40 px-3 text-left font-bold text-xs text-foreground focus:ring-0 focus:ring-offset-0 focus:border-primary hover:border-primary/60 hover:bg-muted/70 transition-all cursor-pointer shadow-none outline-none">
                      <SelectValue placeholder="Chọn chế độ hiển thị..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-1 z-50">
                      <SelectItem value="immediate" className="py-2 pl-8 pr-2.5 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-xs">Xem đáp án ngay</span>
                            <span className="text-[10px] text-muted-foreground">
                              Hiện lời giải & đáp án tức thì sau từng câu
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="review" className="py-2 pl-8 pr-2.5 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-xs">Thi thử & Kiểm tra</span>
                            <span className="text-[10px] text-muted-foreground">
                              Mô phỏng đợt thi thật, nộp bài mới chấm điểm
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="flashcard" className="py-2 pl-8 pr-2.5 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-xs">Học lật thẻ (Flashcard)</span>
                            <span className="text-[10px] text-muted-foreground">
                              Lật thẻ ghi nhớ thuật ngữ & kiến thức trọng tâm
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* PC Web Selectable Cards Grid - Compact & 100% Scaled */}
                <div className="hidden sm:grid sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onModeChange('immediate')}
                    className={cn(
                      'p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all duration-200 flex flex-col justify-between gap-1.5 cursor-pointer group relative overflow-hidden min-h-[72px] sm:min-h-[76px] hover:scale-[1.01] active:scale-[0.99]',
                      selectedMode === 'immediate'
                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-2xs'
                        : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/60'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-md flex items-center justify-center transition-colors',
                          selectedMode === 'immediate'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-muted text-primary group-hover:bg-primary/20'
                        )}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      {selectedMode === 'immediate' && (
                        <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-[11.5px] sm:text-xs text-foreground">Xem đáp án ngay</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        Hiện lời giải & đáp án tức thì sau từng câu
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onModeChange('review')}
                    className={cn(
                      'p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all duration-200 flex flex-col justify-between gap-1.5 cursor-pointer group relative overflow-hidden min-h-[72px] sm:min-h-[76px] hover:scale-[1.01] active:scale-[0.99]',
                      selectedMode === 'review'
                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-2xs'
                        : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/60'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-md flex items-center justify-center transition-colors',
                          selectedMode === 'review'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-muted text-primary group-hover:bg-primary/20'
                        )}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      {selectedMode === 'review' && (
                        <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-[11.5px] sm:text-xs text-foreground">Thi thử & Kiểm tra</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        Mô phỏng đợt thi thật, nộp bài mới chấm điểm
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onModeChange('flashcard')}
                    className={cn(
                      'p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all duration-200 flex flex-col justify-between gap-1.5 cursor-pointer group relative overflow-hidden min-h-[72px] sm:min-h-[76px] hover:scale-[1.01] active:scale-[0.99]',
                      selectedMode === 'flashcard'
                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-2xs'
                        : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/60'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-md flex items-center justify-center transition-colors',
                          selectedMode === 'flashcard'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-muted text-primary group-hover:bg-primary/20'
                        )}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      {selectedMode === 'flashcard' && (
                        <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-[11.5px] sm:text-xs text-foreground">Học lật thẻ (Flashcard)</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        Lật thẻ ghi nhớ thuật ngữ & kiến thức trọng tâm
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Thứ tự câu hỏi */}
              <div className="space-y-1.5 gsap-modal-item">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black">
                      2
                    </span>
                    Thứ tự câu hỏi
                  </span>
                </div>

                {/* Mobile Select Dropdown */}
                <div className="sm:hidden">
                  <Select
                    value={selectedDifficulty}
                    onValueChange={(val: 'sequential' | 'random') => onDifficultyChange(val)}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl border border-border bg-muted/40 px-3 text-left font-bold text-xs text-foreground focus:ring-0 focus:ring-offset-0 focus:border-primary hover:border-primary/60 hover:bg-muted/70 transition-all cursor-pointer shadow-none outline-none">
                      <SelectValue placeholder="Chọn thứ tự câu hỏi..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border bg-popover text-popover-foreground shadow-xl p-1 z-50">
                      <SelectItem value="sequential" className="py-2 pl-8 pr-2.5 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-2">
                          <AlignJustify className="w-3.5 h-3.5 text-primary shrink-0" />
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-xs">Thứ tự mặc định</span>
                            <span className="text-[10px] text-muted-foreground">
                              Theo thứ tự gốc từ câu 1 đến hết
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="random" className="py-2 pl-8 pr-2.5 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Shuffle className="w-3.5 h-3.5 text-primary shrink-0" />
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-xs">Trộn ngẫu nhiên</span>
                            <span className="text-[10px] text-muted-foreground">
                              Xáo trộn vị trí các câu hỏi trong đề
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* PC Web Selectable Cards Grid - Compact & 100% Scaled */}
                <div className="hidden sm:grid sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onDifficultyChange('sequential')}
                    className={cn(
                      'p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-2.5 cursor-pointer group relative overflow-hidden min-h-[52px] sm:min-h-[56px] hover:scale-[1.01] active:scale-[0.99]',
                      selectedDifficulty === 'sequential'
                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-2xs'
                        : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/60'
                    )}
                  >
                    <div
                      className={cn(
                        'w-6.5 h-6.5 rounded-md flex items-center justify-center shrink-0 transition-colors mt-0.5',
                        selectedDifficulty === 'sequential'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-muted text-primary group-hover:bg-primary/20'
                      )}
                    >
                      <AlignJustify className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <p className="font-bold text-[11.5px] sm:text-xs text-foreground">Thứ tự mặc định</p>
                        {selectedDifficulty === 'sequential' && (
                          <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        Theo thứ tự gốc từ câu 1 đến hết
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDifficultyChange('random')}
                    className={cn(
                      'p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-2.5 cursor-pointer group relative overflow-hidden min-h-[52px] sm:min-h-[56px] hover:scale-[1.01] active:scale-[0.99]',
                      selectedDifficulty === 'random'
                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-2xs'
                        : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/60'
                    )}
                  >
                    <div
                      className={cn(
                        'w-6.5 h-6.5 rounded-md flex items-center justify-center shrink-0 transition-colors mt-0.5',
                        selectedDifficulty === 'random'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-muted text-primary group-hover:bg-primary/20'
                      )}
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <p className="font-bold text-[11.5px] sm:text-xs text-foreground">Trộn ngẫu nhiên</p>
                        {selectedDifficulty === 'random' && (
                          <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        Xáo trộn vị trí các câu hỏi trong đề
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Start Action CTA */}
            <div className="pt-1.5 sm:pt-2 gsap-modal-item">
              <Button
                onClick={onStart}
                className="h-10 sm:h-11 w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-wider text-xs shadow-md transition-all cursor-pointer active:scale-[0.99] shrink-0"
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
