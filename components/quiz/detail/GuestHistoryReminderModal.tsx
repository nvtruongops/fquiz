'use client'

import React, { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import {
  LogIn,
  Sparkles,
  History,
  Trophy,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/shared/ui/dialog'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'

interface GuestHistoryReminderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinueAsGuest: () => void
  onLogin: () => void
}

export function GuestHistoryReminderModal({
  open,
  onOpenChange,
  onContinueAsGuest,
  onLogin,
}: GuestHistoryReminderModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!open || !containerRef.current) return

      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('.gsap-reminder-item', { autoAlpha: 1, y: 0 })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.gsap-reminder-item',
          { autoAlpha: 0, y: 12 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.3,
            stagger: 0.05,
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
      <DialogContent className="fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 w-full sm:fixed sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md rounded-t-[24px] rounded-b-none sm:rounded-[24px] border-t sm:border border-border p-0 shadow-2xl overflow-hidden bg-card text-foreground flex flex-col z-50">
        <div ref={containerRef} className="flex flex-col h-full w-full">
          {/* Header Banner */}
          <div className="bg-primary px-4 pt-4 pb-3 sm:px-5 sm:py-4 text-primary-foreground relative shrink-0 text-center">
            <div className="w-9 h-1 rounded-full bg-primary-foreground/35 mx-auto mb-2 sm:hidden" />

            <div className="w-11 h-11 rounded-2xl bg-primary-foreground/15 text-primary-foreground flex items-center justify-center mx-auto mb-2 shadow-xs gsap-reminder-item border border-primary-foreground/20">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="flex justify-center mb-1 gsap-reminder-item">
              <Badge
                variant="secondary"
                className="bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30 font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full"
              >
                Chế độ Khách · Guest Mode
              </Badge>
            </div>

            <DialogTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-primary-foreground gsap-reminder-item">
              Lưu Lại Tiến Trình Học Tập
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/85 text-[11px] sm:text-xs font-medium mt-1 leading-normal max-w-xs mx-auto gsap-reminder-item">
              Đăng nhập để hệ thống tự động lưu lịch sử, ghi nhận điểm số và mở khóa đầy đủ tính năng ôn tập.
            </DialogDescription>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-5 space-y-4">
            {/* Feature Perks Comparison */}
            <div className="space-y-2 gsap-reminder-item">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Quyền lợi khi đăng nhập:
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 border border-border/70 text-left">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <History className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight">Lưu lịch sử & tiến độ làm bài</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">Xem lại kết quả & phân tích chi tiết mọi lúc</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 border border-border/70 text-left">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight">Luyện tập lại các câu sai</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">Tự động lọc câu sai để ôn lại đến khi nhớ</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 border border-border/70 text-left">
                  <div className="w-7 h-7 rounded-lg bg-success-fg/10 text-success-fg flex items-center justify-center shrink-0">
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight">Ghi nhận chuỗi học & bảng điểm</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">Tính điểm tích lũy & theo dõi độ chuyên cần</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1 gsap-reminder-item">
              <Button
                onClick={onLogin}
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập để lưu tiến trình</span>
              </Button>

              <Button
                variant="outline"
                onClick={onContinueAsGuest}
                className="w-full h-10 rounded-xl border-border bg-card hover:bg-muted font-bold text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Tiếp tục làm bài với tư cách Khách</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
