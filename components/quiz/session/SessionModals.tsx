'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface SessionModalsProps {
  confirmOpen: boolean
  setConfirmOpen: (open: boolean) => void
  exitConfirmOpen: boolean
  setExitConfirmOpen: (open: boolean) => void
  answeredCount: number
  totalQuestions: number
  isPending: boolean
  onConfirmSubmit: () => void
  onConfirmExit: () => void
}

export function SessionModals({
  confirmOpen,
  setConfirmOpen,
  exitConfirmOpen,
  setExitConfirmOpen,
  answeredCount,
  totalQuestions,
  isPending,
  onConfirmSubmit,
  onConfirmExit
}: SessionModalsProps) {
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
