'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog'
import { Button } from '@/components/shared/ui/button'
import { AlertCircle, HelpCircle, Loader2 } from 'lucide-react'

interface SessionModalsProps {
  confirmOpen: boolean
  setConfirmOpen: (open: boolean) => void
  exitConfirmOpen: boolean
  setExitConfirmOpen: (open: boolean) => void
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
        <DialogContent className="max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-slate-900 dark:text-slate-100">
              Tạm dừng bài thi?
            </DialogTitle>
            <DialogDescription className="pt-2 text-center text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Tiến trình làm bài đã được lưu tự động trên hệ thống. Bạn có thể quay lại tiếp tục bất kỳ lúc nào.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExitConfirmOpen(false)}
              className="h-11 flex-1 rounded-xl border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300"
            >
              Tiếp tục làm bài
            </Button>
            <Button
              type="button"
              onClick={onConfirmExit}
              className="h-11 flex-1 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-semibold shadow-md"
            >
              Tạm dừng &amp; Thoát
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})
