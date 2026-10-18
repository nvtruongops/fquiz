'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { Compass, Clock, Lock } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { useAuthPrompt } from '@/store/shared/auth-prompt-store'
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/ui/dialog'

interface MobileNavExamSheetProps {
  open: boolean
  pathname: string
  user?: { name: string; role: string; avatarUrl?: string } | null
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

export function MobileNavExamSheet({
  open,
  pathname,
  user,
  onClose,
  triggerRef,
}: MobileNavExamSheetProps) {
  const { openAuthPrompt } = useAuthPrompt()
  const handingOffToAuthPrompt = useRef(false)

  const isExploreActive = pathname === '/explore' || pathname?.startsWith('/courses')
  const isHistoryActive = pathname === '/history'

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
        <DialogContent
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (handingOffToAuthPrompt.current) {
              handingOffToAuthPrompt.current = false
              return
            }
            if (triggerRef.current?.getClientRects().length) triggerRef.current.focus()
            else document.querySelector<HTMLElement>('[data-desktop-nav-home]')?.focus()
          }}
          className="left-1/2 top-auto bottom-0 translate-y-0 w-full max-w-lg bg-card/95 backdrop-blur-2xl border-t border-border/80 rounded-t-[32px] sm:rounded-t-[32px] sm:rounded-b-none shadow-2xl p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] gap-0 overflow-hidden max-h-[85dvh] flex flex-col touch-pan-y lg:hidden"
        >
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20 mx-auto mt-0.5 mb-2.5 shrink-0" />
          <div className="px-2 py-2 pr-10 border-b border-border/60 flex items-center justify-between shrink-0">
            <DialogTitle className="text-xs font-black uppercase tracking-wider text-foreground">
              Quizzes & Exams
            </DialogTitle>
          </div>

          <div className="space-y-1.5 pt-1 pb-6 sm:pb-8 overflow-y-auto custom-scrollbar flex-1 min-h-0">
            <Link
              href="/explore"
              prefetch={false}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-2xl text-xs font-bold transition-all active:scale-98 border',
                isExploreActive
                  ? 'bg-primary/10 border-primary/20 text-primary shadow-xs'
                  : 'border-transparent text-foreground hover:bg-muted/70'
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                  isExploreActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-primary/10 text-primary border border-primary/15'
                )}
              >
                <Compass aria-hidden="true" className="w-4.5 h-4.5" />
              </div>
              <span>Explore Quizzes</span>
            </Link>

            <Link
              href="/history"
              prefetch={false}
              onClick={(e) => {
                onClose()
                if (!user) {
                  e.preventDefault()
                  handingOffToAuthPrompt.current = true
                  openAuthPrompt({
                    featureName: 'Exam History',
                    description: 'Track progress, review results, and retry incorrect questions',
                    targetUrl: '/history',
                  })
                }
              }}
              className={cn(
                'flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold transition-all active:scale-98 border',
                isHistoryActive
                  ? 'bg-primary/10 border-primary/20 text-primary shadow-xs'
                  : 'border-transparent text-foreground hover:bg-muted/70'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                    isHistoryActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-primary/10 text-primary border border-primary/15'
                  )}
                >
                  <Clock aria-hidden="true" className="w-4.5 h-4.5" />
                </div>
                <span>Exam History</span>
              </div>
              {!user && <Lock aria-hidden="true" className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            </Link>
          </div>
        </DialogContent>
    </Dialog>
  )
}
