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
      <DialogContent
        closeButtonAriaLabel="Close sign-in reminder"
        className="fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 w-full sm:fixed sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md rounded-t-[24px] rounded-b-none sm:rounded-[24px] border-t sm:border border-border p-0 shadow-2xl overflow-hidden bg-card text-foreground flex flex-col z-50 [&>button]:z-20 [&>button]:top-3.5 sm:[&>button]:top-4.5 [&>button]:right-3.5 sm:[&>button]:right-4.5 [&>button]:w-9 [&>button]:h-9 [&>button]:rounded-full [&>button]:bg-muted/60 [&>button:hover]:bg-muted [&>button]:text-muted-foreground [&>button:hover]:text-foreground [&>button]:border [&>button]:border-border/60 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:transition-all"
      >
        <div ref={containerRef} className="flex flex-col h-full w-full">
          {/* Header Banner */}
          <div className="bg-card border-b border-border/80 px-5 pt-3 pb-4 sm:px-6 sm:pt-5 sm:pb-5 relative shrink-0 text-center">
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/20 mx-auto mb-3 sm:hidden" />

            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto mb-2.5 shadow-xs gsap-reminder-item">
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            </div>

            <div className="flex justify-center mb-1.5 gsap-reminder-item">
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20 font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                <span>Guest Mode</span>
              </Badge>
            </div>

            <DialogTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-foreground gsap-reminder-item">
              Save Your Study Progress
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-medium mt-1 leading-relaxed max-w-xs mx-auto gsap-reminder-item">
              Sign in to automatically save your history, track scores, and unlock complete review tools.
            </DialogDescription>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-5 space-y-4">
            {/* Feature Perks Comparison */}
            <div className="space-y-2 gsap-reminder-item">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Member benefits:
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 border border-border/70 text-left">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <History className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight">Save quiz history & progress</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">Review results and in-depth analytics anytime</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 border border-border/70 text-left">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight">Practice incorrect questions</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">Automatically filter incorrect answers until mastered</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 border border-border/70 text-left">
                  <div className="w-7 h-7 rounded-lg bg-success-fg/10 text-success-fg flex items-center justify-center shrink-0">
                    <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight">Track learning streaks & badges</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">Earn cumulative points and monitor consistency</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 justify-center text-[10.5px] text-muted-foreground font-semibold pt-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                <span>Instant study progress synchronization</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1 gsap-reminder-item">
              <Button
                onClick={onLogin}
                className="w-full h-11 min-h-[44px] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>Sign in to save progress</span>
              </Button>

              <Button
                variant="outline"
                onClick={onContinueAsGuest}
                className="w-full h-11 min-h-[44px] rounded-xl border-border bg-card hover:bg-muted font-bold text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Continue as Guest</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
