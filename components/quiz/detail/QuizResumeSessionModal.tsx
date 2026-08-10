'use client'

import React, { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/shared/ui/dialog'
import { Button } from '@/components/shared/ui/button'

interface QuizResumeSessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeSessionInfo: any
  onContinue: () => void
  onRestart: () => void
  onCloseResumeDialog: () => void
}

export function QuizResumeSessionModal({
  open,
  onOpenChange,
  activeSessionInfo,
  onContinue,
  onRestart,
  onCloseResumeDialog,
}: QuizResumeSessionModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // GSAP Entrance Stagger & Micro-interactions
  useGSAP(
    () => {
      if (!open || !containerRef.current) return

      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('.gsap-resume-item', { autoAlpha: 1, y: 0 })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.gsap-resume-item',
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

  const isFlashcardMode =
    activeSessionInfo?.mode === 'flashcard' || activeSessionInfo?.cardsUnknown > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 w-full sm:fixed sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md rounded-t-[24px] rounded-b-none sm:rounded-[24px] border-t sm:border border-border p-0 shadow-2xl overflow-hidden bg-card text-card-foreground flex flex-col h-auto max-h-[88dvh] sm:max-h-[90vh] max-sm:data-[state=open]:slide-in-from-left-0 max-sm:data-[state=closed]:slide-out-to-left-0 data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-1/2 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-1/2 sm:data-[state=closed]:zoom-out-95 [&>button]:z-20 [&>button]:w-7.5 [&>button]:h-7.5 sm:[&>button]:w-8 sm:[&>button]:h-8 [&>button]:rounded-full [&>button]:bg-primary-foreground/20 [&>button:hover]:bg-primary-foreground/35 [&>button]:border [&>button]:border-primary-foreground/30 [&>button]:text-primary-foreground [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:transition-all [&>button]:duration-200 [&>button:hover]:scale-105 [&>button:active]:scale-95 [&>button]:top-3 sm:[&>button]:top-3.5 [&>button]:right-3.5 sm:[&>button]:right-4 [&>button>svg]:h-4 [&>button>svg]:w-4 [&>button>svg]:transition-transform [&>button:hover>svg]:rotate-90 z-50">
        <div ref={containerRef} className="flex flex-col h-full w-full">
          {isFlashcardMode ? (
            <>
              {/* Header */}
              <div className="bg-primary px-4 pt-3.5 pb-3 sm:px-5 sm:py-3.5 text-primary-foreground shrink-0">
                <div className="w-9 h-1 rounded-full bg-primary-foreground/35 mx-auto mb-2 sm:hidden" />
                <DialogTitle className="text-base sm:text-lg font-black uppercase tracking-tight mb-1 gsap-resume-item">
                  Học Lật Thẻ (Flashcard)
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/85 text-[11px] sm:text-xs font-medium leading-relaxed gsap-resume-item">
                  Với Quiz này ở chế độ{' '}
                  <strong className="text-primary-foreground font-bold">Học Lật Thẻ (Flashcard)</strong>, bạn vẫn còn{' '}
                  <strong className="text-primary-foreground font-extrabold">
                    {activeSessionInfo?.cardsUnknown ?? activeSessionInfo?.answeredCount ?? 0}/
                    {activeSessionInfo?.totalCards ?? activeSessionInfo?.totalQuestions ?? 0} câu chưa nhớ
                  </strong>
                  . Bạn có muốn học tiếp hay làm mới?
                </DialogDescription>
              </div>

              {/* Body */}
              <div className="p-3.5 sm:p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                <div className="rounded-xl sm:rounded-2xl bg-primary/10 p-3 sm:p-3.5 border border-primary/20 gsap-resume-item">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Tiến độ thẻ chưa nhớ
                    </span>
                    <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      {activeSessionInfo?.cardsUnknown ?? 0}/{activeSessionInfo?.totalCards ?? 0} câu chưa nhớ
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-0.5 gsap-resume-item">
                  <Button
                    onClick={onContinue}
                    className="h-10.5 sm:h-11 w-full rounded-xl bg-primary hover:bg-primary/90 font-bold text-xs uppercase tracking-wider text-primary-foreground shadow-md transition-all cursor-pointer"
                  >
                    Học tiếp (Ôn lại{' '}
                    {activeSessionInfo?.cardsUnknown ?? activeSessionInfo?.answeredCount ?? 0} câu chưa nhớ)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onRestart}
                    className="h-10.5 sm:h-11 w-full rounded-xl border-border bg-card font-bold text-xs uppercase tracking-wider text-foreground hover:bg-muted transition-all cursor-pointer"
                  >
                    Làm mới (Bắt đầu từ đầu)
                  </Button>
                  <button
                    type="button"
                    onClick={onCloseResumeDialog}
                    className="py-1 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer text-center"
                  >
                    Đổi chế độ học khác
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="bg-primary px-4 pt-3.5 pb-3 sm:px-5 sm:py-3.5 text-primary-foreground shrink-0">
                <div className="w-9 h-1 rounded-full bg-primary-foreground/35 mx-auto mb-2 sm:hidden" />
                <DialogTitle className="text-base sm:text-lg font-black uppercase tracking-tight mb-1 gsap-resume-item">
                  Phát hiện phiên học cũ
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/85 text-[11px] sm:text-xs font-medium leading-relaxed gsap-resume-item">
                  Bạn đang có một phiên làm bài chưa hoàn thành.
                </DialogDescription>
              </div>

              {/* Body */}
              <div className="p-3.5 sm:p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                <div className="rounded-xl sm:rounded-2xl bg-primary/10 p-3 sm:p-3.5 border border-primary/20 gsap-resume-item">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Tiến độ hiện tại
                    </span>
                    <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded-full text-[10px] font-black">
                      {activeSessionInfo?.answeredCount ?? 0}/{activeSessionInfo?.totalQuestions ?? 0} CÂU
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-1000"
                      style={{
                        width: `${
                          ((activeSessionInfo?.answeredCount ?? 0) /
                            (activeSessionInfo?.totalQuestions ?? 1)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[10.5px] font-bold text-foreground uppercase tracking-tight">
                    Chế độ:{' '}
                    {activeSessionInfo?.mode === 'immediate'
                      ? 'Thực hành'
                      : activeSessionInfo?.mode === 'flashcard'
                      ? 'Flashcard'
                      : 'Kiểm tra'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-0.5 gsap-resume-item">
                  <Button
                    onClick={onContinue}
                    className="h-10.5 sm:h-11 w-full rounded-xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-primary-foreground shadow-md transition-all cursor-pointer"
                  >
                    Tiếp tục làm bài
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onRestart}
                    className="h-10.5 sm:h-11 w-full rounded-xl border-border bg-card font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all cursor-pointer"
                  >
                    Làm lại từ đầu
                  </Button>
                  <button
                    type="button"
                    onClick={onCloseResumeDialog}
                    className="py-1 text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] hover:text-foreground transition-colors cursor-pointer text-center"
                  >
                    Đổi chế độ học khác
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
