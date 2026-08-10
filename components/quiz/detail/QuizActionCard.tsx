'use client'

import React from 'react'
import { ShieldCheck, Zap, PlayCircle, Loader2, ChevronRight, History } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { cn } from '@/lib/core/utils/cn'
import { QuizPracticeOptionsModal } from './QuizPracticeOptionsModal'
import { QuizResumeSessionModal } from './QuizResumeSessionModal'

interface QuizActionCardProps {
  quizId: string
  selectedMode: 'immediate' | 'review' | 'flashcard'
  selectedDifficulty: 'sequential' | 'random'
  onModeChange: (mode: 'immediate' | 'review' | 'flashcard') => void
  onDifficultyChange: (difficulty: 'sequential' | 'random') => void
  onStart: () => void
  isStarting: boolean
  modeSelectOpen: boolean
  setModeSelectOpen: (open: boolean) => void
  resumeDialogOpen: boolean
  setResumeDialogOpen: (open: boolean) => void
  activeSessionInfo: any
  onContinue: () => void
  onRestart: () => void
  onCloseResumeDialog: () => void
  currentUser: any
  authRequiredDialogOpen?: boolean
  setAuthRequiredDialogOpen?: (open: boolean) => void
  hasHistory?: boolean
  latestSessionId?: string
}

/* eslint-disable sonarjs/cognitive-complexity */
export function QuizActionCard({
  quizId,
  selectedMode,
  selectedDifficulty,
  onModeChange,
  onDifficultyChange,
  onStart,
  isStarting,
  modeSelectOpen,
  setModeSelectOpen,
  resumeDialogOpen,
  setResumeDialogOpen,
  activeSessionInfo,
  onContinue,
  onRestart,
  onCloseResumeDialog,
  currentUser,
  authRequiredDialogOpen,
  setAuthRequiredDialogOpen,
  hasHistory,
  latestSessionId
}: QuizActionCardProps) {
  const router = useRouter()
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-5 shadow-xs">
          <div className="mb-3 border-b border-border pb-2.5">
            <h3 className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.25em] text-primary">Tùy chọn học tập</h3>
            <p className="mt-0.5 text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase">Cấu hình phiên làm bài của bạn</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-muted/60 p-2 sm:p-2.5 transition-colors hover:bg-muted">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md sm:rounded-lg bg-card shadow-xs text-primary">
                <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-extrabold uppercase tracking-wider text-foreground truncate">Auto-Grading</p>
                <p className="text-[7.5px] font-bold text-muted-foreground uppercase truncate">Chấm 100%</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-muted/60 p-2 sm:p-2.5 transition-colors hover:bg-muted">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md sm:rounded-lg bg-card shadow-xs text-amber-400">
                <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-extrabold uppercase tracking-wider text-foreground truncate">Instant Feedback</p>
                <p className="text-[7.5px] font-bold text-muted-foreground uppercase truncate">Kết quả ngay</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={() => {
                if (!currentUser) {
                  const safeCallback = encodeURIComponent(`/quiz/${quizId}`)
                  router.push(`/login?callbackUrl=${safeCallback}`)
                } else {
                  setModeSelectOpen(true)
                }
              }}
              className="group relative h-10 sm:h-12 w-full overflow-hidden rounded-xl sm:rounded-2xl bg-primary font-bold uppercase tracking-[0.1em] text-primary-foreground shadow-xs hover:bg-primary/90 transition-all text-xs cursor-pointer"
              disabled={isStarting}
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                Bắt đầu ngay
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Button>

            {hasHistory && latestSessionId && (
              <Button
                variant="outline"
                className="w-full h-9 sm:h-11 rounded-xl sm:rounded-2xl border border-border font-bold uppercase tracking-wider text-primary hover:bg-muted transition-all text-[10px] sm:text-[11px] cursor-pointer"
                asChild
              >
                <Link href={`/history/${quizId}/${latestSessionId}`}>
                  <History className="h-3.5 w-3.5 mr-1.5" />
                  Xem lịch sử trước đó
                </Link>
              </Button>
            )}
          </div>

          <QuizPracticeOptionsModal
            open={modeSelectOpen}
            onOpenChange={setModeSelectOpen}
            selectedMode={selectedMode}
            onModeChange={onModeChange}
            selectedDifficulty={selectedDifficulty}
            onDifficultyChange={onDifficultyChange}
            onStart={onStart}
            isStarting={isStarting}
          />

          <QuizResumeSessionModal
            open={resumeDialogOpen}
            onOpenChange={setResumeDialogOpen}
            activeSessionInfo={activeSessionInfo}
            onContinue={onContinue}
            onRestart={onRestart}
            onCloseResumeDialog={onCloseResumeDialog}
          />
        </div>
      </div>
    </div>
  )
}
