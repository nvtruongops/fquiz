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
          <DialogContent className="max-w-md border-2 border-[#101010] bg-[#f3f3f3] p-5">
            <DialogHeader>
              <DialogTitle className="text-center text-[22px] font-bold text-[#101010]">Xác nhận nộp bài</DialogTitle>
              <DialogDescription className="pt-1 text-center text-[15px] text-[#3d3d3d]">
                Bạn đã làm {answeredCount}/{totalQuestions} câu. Bạn có chắc chắn muốn nộp không?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-2 flex gap-2 sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                className="rounded-none border-[#101010] bg-white px-6 text-[15px] font-semibold text-[#111111] hover:bg-[#efefef]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onConfirmSubmit}
                disabled={isPending}
                className="rounded-none border border-[#101010] bg-[#efefef] px-6 text-[15px] font-semibold text-[#111111] hover:bg-white"
              >
                {isPending ? 'Đang nộp...' : 'OK'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
          <DialogContent className="max-w-md border-2 border-[#101010] bg-[#f3f3f3] p-5">
            <DialogHeader>
              <DialogTitle className="text-center text-[22px] font-bold text-[#101010]">Dừng làm bài?</DialogTitle>
              <DialogDescription className="pt-1 text-center text-[15px] text-[#3d3d3d]">
                Tiến trình của bạn đã được lưu tự động. Bạn có muốn tạm dừng và quay lại sau không?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-2 flex gap-2 sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExitConfirmOpen(false)}
                className="rounded-none border-[#101010] bg-white px-6 text-[15px] font-semibold text-[#111111] hover:bg-[#efefef]"
              >
                Tiếp tục làm bài
              </Button>
              <Button
                type="button"
                onClick={onConfirmExit}
                className="rounded-none border border-[#101010] bg-[#efefef] px-6 text-[15px] font-semibold text-[#111111] hover:bg-white"
              >
                Tạm dừng &amp; Thoát
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 5-minute Inactivity Pause Modal */}
        <Dialog open={inactivityPauseOpen} onOpenChange={setInactivityPauseOpen}>
          <DialogContent className="max-w-md border-2 border-[#101010] bg-[#f3f3f3] p-5">
            <DialogHeader>
              <DialogTitle className="text-center text-[22px] font-bold text-[#101010]">Đã tự động tạm dừng</DialogTitle>
              <DialogDescription className="pt-1 text-center text-[15px] text-[#3d3d3d]">
                Bạn đã dừng thao tác trên câu hỏi này quá 5 phút. Bài thi đã tự động tạm dừng đếm giờ để bảo toàn tiến trình của bạn.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-2 flex gap-2 sm:justify-center">
              <Button
                type="button"
                onClick={() => onResumeInactivity?.()}
                className="rounded-none border border-[#101010] bg-[#efefef] px-6 text-[15px] font-semibold text-[#111111] hover:bg-white"
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
        <DialogContent className="max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <HelpCircle className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-slate-900 dark:text-slate-100">
              Xác nhận nộp bài thi
            </DialogTitle>
            <DialogDescription className="pt-2 text-center text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Bạn đã hoàn thành <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{answeredCount}/{totalQuestions}</strong> câu hỏi. Bạn có muốn nộp bài ngay bây giờ không?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="h-11 flex-1 rounded-xl border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              onClick={onConfirmSubmit}
              disabled={isPending}
              className="h-11 flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-bold text-white shadow-md shadow-emerald-600/20"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isPending ? 'Đang gửi...' : 'Nộp bài thi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
        <DialogContent className="max-w-sm rounded-3xl border border-slate-200/80 bg-white p-0 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

          <div className="px-6 pt-6 pb-2">
            <DialogHeader className="text-center sm:text-center space-y-4">
              {/* Icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 shadow-sm">
                <Pause className="h-7 w-7 text-amber-600" />
              </div>

              <div className="space-y-2">
                <DialogTitle className="text-center text-lg font-black text-slate-900 tracking-tight">
                  Tạm dừng bài thi?
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-3">
                    {/* Progress indicator */}
                    <div className="mx-auto flex items-center justify-center gap-3 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                      <div className="text-center">
                        <div className="text-2xl font-black text-slate-900 tabular-nums">{answeredCount}<span className="text-slate-400 text-lg font-bold">/{totalQuestions}</span></div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Câu đã làm</div>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div className="text-center">
                        <div className="text-2xl font-black text-amber-600 tabular-nums">{totalQuestions - answeredCount}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Câu còn lại</div>
                      </div>
                    </div>

                    {/* Auto-save notice */}
                    <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">Tiến trình đã được lưu tự động</span>
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
              className="w-full h-12 rounded-2xl bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-bold text-sm shadow-md shadow-[#5D7B6F]/15 transition-all"
            >
              Tiếp tục làm bài
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onConfirmExit}
              className="w-full h-11 rounded-2xl border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 hover:text-slate-800 transition-all"
            >
              Tạm dừng & Thoát
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modern 5-minute Inactivity Pause Modal */}
      <Dialog open={inactivityPauseOpen} onOpenChange={setInactivityPauseOpen}>
        <DialogContent className="max-w-sm rounded-3xl border border-slate-200/80 bg-white p-0 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
          <div className="px-6 pt-6 pb-2">
            <DialogHeader className="text-center sm:text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/60 shadow-sm text-amber-600">
                <Pause className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-center text-lg font-black text-slate-900 tracking-tight">
                  Đã tự động tạm dừng
                </DialogTitle>
                <DialogDescription className="text-center text-xs leading-relaxed text-slate-600">
                  Bạn đã dừng thao tác trên câu hỏi này quá 5 phút. Bài thi đã tự động tạm dừng đếm giờ để bảo toàn tiến trình làm bài của bạn.
                </DialogDescription>
              </div>
            </DialogHeader>
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 flex flex-col">
            <Button
              type="button"
              onClick={() => onResumeInactivity?.()}
              className="w-full h-12 rounded-2xl bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-bold text-sm shadow-md shadow-[#5D7B6F]/15 transition-all"
            >
              Tiếp tục làm bài
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})
