'use client'

import React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, Clock, Lock, X } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { useAuthPrompt } from '@/store/shared/auth-prompt-store'

interface MobileNavExamSheetProps {
  open: boolean
  pathname: string
  user?: { name: string; role: string; avatarUrl?: string } | null
  onClose: () => void
}

export function MobileNavExamSheet({
  open,
  pathname,
  user,
  onClose,
}: MobileNavExamSheetProps) {
  const { openAuthPrompt } = useAuthPrompt()

  const isExploreActive = pathname === '/explore' || pathname?.startsWith('/courses')
  const isHistoryActive = pathname === '/history'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-exam-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 lg:hidden"
          aria-hidden="true"
        />
      )}
      {open && (
        <motion.div
          key="mobile-exam-panel"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="fixed bottom-0 inset-x-0 w-full max-w-lg mx-auto bg-card/95 backdrop-blur-2xl border-t border-border/80 rounded-t-[32px] shadow-2xl p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2 overflow-hidden z-50 max-h-[85dvh] flex flex-col touch-pan-y lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Quizzes & Exams"
        >
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20 mx-auto mt-0.5 mb-2.5 shrink-0" />
          <div className="px-2 py-2 border-b border-border/60 flex items-center justify-between shrink-0">
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              Quizzes & Exams
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Quizzes and Exams sheet"
              className="w-9 h-9 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center border border-border/40 transition-colors cursor-pointer"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}
