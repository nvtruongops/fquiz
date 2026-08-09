'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog'
import { Button } from '@/components/shared/ui/button'
import { AlertCircle, HelpCircle, Loader2, Pause, CheckCircle2, ArrowRight } from 'lucide-react'

interface SessionModalsProps {
  confirmOpen: boolean
  setConfirmOpen: (open: boolean) => void
  exitConfirmOpen: boolean
  setExitConfirmOpen: (open: boolean) => void
  inactivityPauseOpen?: boolean
  setInactivityPauseOpen?: (open: boolean) => void
  onResumeInactivity?: () => void
  answeredCount: number
  totalQuestions: number
  isPending: boolean
  enableAnimation?: boolean
  onConfirmSubmit: () => void
  onConfirmExit: () => void
}

export const SessionModals = React.memo(function SessionModals({
  confirmOpen,
  setConfirmOpen,
  exitConfirmOpen,
  setExitConfirmOpen,
  inactivityPauseOpen = false,
  setInactivityPauseOpen,
  onResumeInactivity,
  answeredCount,
  totalQuestions,
  isPending,
  enableAnimation = true,
  onConfirmSubmit,
  onConfirmExit
}: SessionModalsProps) {
  if (!enableAnimation) {
    return (
      <>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-center text-base font-bold text-foreground">Xác nhận nộp bài</DialogTitle>
              <DialogDescription className="pt-1 text-center text-sm text-muted-foreground">
                Bạn đã làm <strong className="text-primary font-bold">{answeredCount}/{totalQuestions}</strong> câu. Bạn có chắc chắn muốn nộp không?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex gap-2 sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border-border bg-card px-6 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={onConfirmSubmit}
                disabled={isPending}
                className="rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover shadow-xs"
              >
                {isPending ? 'Đang nộp...' : 'Nộp bài'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
          <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-center text-base font-bold text-foreground">Dừng làm bài?</DialogTitle>
              <DialogDescription className="pt-1 text-center text-sm text-muted-foreground">
                Tiến trình của bạn đã được lưu tự động. Bạn có muốn tạm dừng và quay lại sau không?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex gap-2 sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExitConfirmOpen(false)}
                className="rounded-xl border-border bg-card px-6 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Tiếp tục làm bài
              </Button>
              <Button
                type="button"
                onClick={onConfirmExit}
                className="rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover shadow-xs"
              >
                Tạm dừng &amp; Thoát
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 5-minute Inactivity Pause Modal */}
        <Dialog open={inactivityPauseOpen} onOpenChange={setInactivityPauseOpen}>
          <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-center text-base font-bold text-foreground">Đã tự động tạm dừng</DialogTitle>
              <DialogDescription className="pt-1 text-center text-sm text-muted-foreground">
                Bạn đã dừng thao tác trên câu hỏi này quá 5 phút. Bài thi đã tự động tạm dừng đếm giờ để bảo toàn tiến trình của bạn.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex gap-2 sm:justify-center">
              <Button
                type="button"
                onClick={() => onResumeInactivity?.()}
                className="rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover shadow-xs"
              >
                Tiếp tục làm bài
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Modern Animated Modals
  return (
    <>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-card-foreground">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <HelpCircle className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-foreground">
              Xác nhận nộp bài thi
            </DialogTitle>
            <DialogDescription className="pt-2 text-center text-sm leading-relaxed text-muted-foreground">
              Bạn đã hoàn thành <strong className="text-primary font-bold">{answeredCount}/{totalQuestions}</strong> câu hỏi. Bạn có muốn nộp bài ngay bây giờ không?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="h-11 flex-1 rounded-xl border-border bg-card font-semibold text-foreground hover:bg-muted"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              onClick={onConfirmSubmit}
              disabled={isPending}
              className="h-11 flex-1 rounded-xl bg-primary hover:bg-primary-hover font-bold text-primary-foreground shadow-md transition-all cursor-pointer"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isPending ? 'Đang gửi...' : 'Nộp bài thi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
        <DialogContent className="max-w-sm rounded-3xl border border-border bg-card p-0 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden text-card-foreground">
          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-primary" />

          <div className="px-6 pt-6 pb-2">
            <DialogHeader className="text-center sm:text-center space-y-4">
              {/* Icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-2xs">
                <Pause className="h-7 w-7 text-primary" />
              </div>

              <div className="space-y-2">
                <DialogTitle className="text-center text-lg font-black text-foreground tracking-tight">
                  Tạm dừng bài thi?
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-3">
                    {/* Progress indicator */}
                    <div className="mx-auto flex items-center justify-center gap-3 rounded-2xl bg-muted border border-border px-4 py-3">
                      <div className="text-center">
                        <div className="text-2xl font-black text-foreground tabular-nums">{answeredCount}<span className="text-muted-foreground text-lg font-bold">/{totalQuestions}</span></div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Câu đã làm</div>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <div className="text-2xl font-black text-primary tabular-nums">{Math.max(totalQuestions - answeredCount, 0)}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Câu còn lại</div>
                      </div>
                    </div>

                    {/* Auto-save notice */}
                    <div className="flex items-center justify-center gap-1.5 text-primary">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">Tiến trình đã được lưu tự động</span>
                    </div>
                  </div>
                </DialogDescription>
              </div>
            </DialogHeader>
          </div>

          <DialogFooter className="px-6 pb-6 pt-2 flex flex-col gap-2.5 sm:flex-col">
            <Button
              type="button"
              onClick={() => setExitConfirmOpen(false)}
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Tiếp tục làm bài
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onConfirmExit}
              className="w-full h-11 rounded-2xl border-border bg-card text-muted-foreground font-semibold text-sm hover:bg-muted hover:text-foreground transition-all cursor-pointer"
            >
              Tạm dừng & Thoát
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modern 5-minute Inactivity Pause Modal */}
      <Dialog open={inactivityPauseOpen} onOpenChange={setInactivityPauseOpen}>
        <DialogContent className="max-w-sm rounded-3xl border border-border bg-card p-0 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden text-card-foreground">
          <div className="h-1.5 w-full bg-primary" />
          <div className="px-6 pt-6 pb-2">
            <DialogHeader className="text-center sm:text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-2xs text-primary">
                <Pause className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-center text-lg font-black text-foreground tracking-tight">
                  Đã tự động tạm dừng
                </DialogTitle>
                <DialogDescription className="text-center text-xs leading-relaxed text-muted-foreground">
                  Bạn đã dừng thao tác trên câu hỏi này quá 5 phút. Bài thi đã tự động tạm dừng đếm giờ để bảo toàn tiến trình làm bài của bạn.
                </DialogDescription>
              </div>
            </DialogHeader>
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 flex flex-col">
            <Button
              type="button"
              onClick={() => onResumeInactivity?.()}
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Tiếp tục làm bài
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})
