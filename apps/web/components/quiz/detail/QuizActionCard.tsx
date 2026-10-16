'use client'

import React from 'react'
import {
  ShieldCheck,
  Zap,
  PlayCircle,
  Loader2,
  ChevronRight,
  History,
  Sparkles,
  FileText,
  BookOpen,
  AlignJustify,
  Shuffle,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { cn } from '@/lib/core/utils/cn'

const QuizResumeSessionModal = dynamic(
  () => import('@/components/quiz/shared/QuizResumeSessionModal'),
  { ssr: false }
)
const GuestHistoryReminderModal = dynamic(
  () => import('./GuestHistoryReminderModal').then((mod) => mod.GuestHistoryReminderModal),
  { ssr: false }
)

interface QuizActionCardProps {
  quizId: string
  selectedMode: 'immediate' | 'review' | 'flashcard'
  selectedDifficulty: 'sequential' | 'random'
  onModeChange: (mode: 'immediate' | 'review' | 'flashcard') => void
  onDifficultyChange: (difficulty: 'sequential' | 'random') => void
  onStart: () => void
  isStarting: boolean
  modeSelectOpen?: boolean
  setModeSelectOpen?: (open: boolean) => void
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

export function QuizActionCard({
  quizId,
  selectedMode,
  selectedDifficulty,
  onModeChange,
  onDifficultyChange,
  onStart,
  isStarting,
  resumeDialogOpen,
  setResumeDialogOpen,
  activeSessionInfo,
  onContinue,
  onRestart,
  onCloseResumeDialog,
  currentUser,
  hasHistory,
  latestSessionId,
}: QuizActionCardProps) {
  const router = useRouter()
  const [guestReminderOpen, setGuestReminderOpen] = React.useState(false)

  const handleStartClick = () => {
    if (!currentUser) {
      setGuestReminderOpen(true)
    } else {
      onStart()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
        {/* Card Header */}
        <div className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-primary">
              Study Options
            </h3>
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/20 font-black text-[9px] uppercase px-2 py-0.5 rounded-full"
            >
              Personalized
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
            Configure your session to match your study preferences
          </p>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2 sm:p-2.5 transition-colors">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card shadow-xs text-primary">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-foreground truncate">Auto-Grading</p>
              <p className="text-[8px] font-bold text-muted-foreground uppercase truncate">100% Graded</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2 sm:p-2.5 transition-colors">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card shadow-xs text-amber-500">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-foreground truncate">Instant Feedback</p>
              <p className="text-[8px] font-bold text-muted-foreground uppercase truncate">Instant Results</p>
            </div>
          </div>
        </div>

        {/* 1. Study Mode */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black">
                1
              </span>
              Study Mode
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground">
              3 study modes
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Study Mode"
            className="grid grid-cols-1 gap-2"
          >
            {/* Immediate Mode */}
            <button
              type="button"
              role="radio"
              aria-checked={selectedMode === 'immediate'}
              aria-label="Instant Answers: Show explanations and answers immediately after each question"
              onClick={() => onModeChange('immediate')}
              className={cn(
                'p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group relative overflow-hidden',
                selectedMode === 'immediate'
                  ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-2xs'
                  : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    selectedMode === 'immediate'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted text-primary group-hover:bg-primary/20'
                  )}
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-foreground">Instant Answers</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Show explanations and answers immediately after each question
                  </p>
                </div>
              </div>
              {selectedMode === 'immediate' && (
                <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />
                </span>
              )}
            </button>

            {/* Review Mode */}
            <button
              type="button"
              role="radio"
              aria-checked={selectedMode === 'review'}
              aria-label="Exam Simulation: Realistic test environment, graded upon completion"
              onClick={() => onModeChange('review')}
              className={cn(
                'p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group relative overflow-hidden',
                selectedMode === 'review'
                  ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-2xs'
                  : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    selectedMode === 'review'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted text-primary group-hover:bg-primary/20'
                  )}
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-foreground">Exam Simulation</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Realistic test environment, graded upon completion
                  </p>
                </div>
              </div>
              {selectedMode === 'review' && (
                <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />
                </span>
              )}
            </button>

            {/* Flashcard Mode */}
            <button
              type="button"
              role="radio"
              aria-checked={selectedMode === 'flashcard'}
              aria-label="Flashcard Study: Flip cards to memorize key terminology and concepts"
              onClick={() => onModeChange('flashcard')}
              className={cn(
                'p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group relative overflow-hidden',
                selectedMode === 'flashcard'
                  ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-2xs'
                  : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    selectedMode === 'flashcard'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted text-primary group-hover:bg-primary/20'
                  )}
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-foreground">Flashcard Study</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Flip cards to memorize key terminology and concepts
                  </p>
                </div>
              </div>
              {selectedMode === 'flashcard' && (
                <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 2. Question Order */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black">
                2
              </span>
              Question Order
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Question Order"
            className="grid grid-cols-2 gap-2"
          >
            {/* Sequential */}
            <button
              type="button"
              role="radio"
              aria-checked={selectedDifficulty === 'sequential'}
              aria-label="Default Order: Sequential from question 1 to end"
              onClick={() => onDifficultyChange('sequential')}
              className={cn(
                'p-2.5 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-2 cursor-pointer group relative overflow-hidden',
                selectedDifficulty === 'sequential'
                  ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-2xs'
                  : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors mt-0.5',
                  selectedDifficulty === 'sequential'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted text-primary group-hover:bg-primary/20'
                )}
              >
                <AlignJustify className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-bold text-[11px] sm:text-xs text-foreground truncate">Default</p>
                  {selectedDifficulty === 'sequential' && (
                    <span className="w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Check className="w-2 h-2 stroke-[3]" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <p className="text-[9.5px] text-muted-foreground mt-0.5 leading-tight">
                  Question 1 to end
                </p>
              </div>
            </button>

            {/* Random */}
            <button
              type="button"
              role="radio"
              aria-checked={selectedDifficulty === 'random'}
              aria-label="Random Shuffle: Randomize question positions in quiz"
              onClick={() => onDifficultyChange('random')}
              className={cn(
                'p-2.5 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-2 cursor-pointer group relative overflow-hidden',
                selectedDifficulty === 'random'
                  ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-2xs'
                  : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors mt-0.5',
                  selectedDifficulty === 'random'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted text-primary group-hover:bg-primary/20'
                )}
              >
                <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-bold text-[11px] sm:text-xs text-foreground truncate">Shuffle</p>
                  {selectedDifficulty === 'random' && (
                    <span className="w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Check className="w-2 h-2 stroke-[3]" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <p className="text-[9.5px] text-muted-foreground mt-0.5 leading-tight">
                  Randomize question order
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Start Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-border">
          <Button
            onClick={handleStartClick}
            className="group relative h-12 w-full overflow-hidden rounded-xl sm:rounded-2xl bg-primary font-black uppercase tracking-wider text-primary-foreground shadow-md hover:bg-primary/90 transition-all text-xs cursor-pointer active:scale-[0.99]"
            disabled={isStarting}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              {isStarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Initializing...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Start Now</span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </>
              )}
            </div>
          </Button>

          {hasHistory && latestSessionId && (
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl sm:rounded-2xl border border-border font-bold uppercase tracking-wider text-primary hover:bg-muted transition-all text-xs cursor-pointer"
              asChild
            >
              <Link href={`/history/${quizId}/${latestSessionId}`}>
                <History className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                View previous attempt
              </Link>
            </Button>
          )}
        </div>

        {/* Modals */}
        <GuestHistoryReminderModal
          open={guestReminderOpen}
          onOpenChange={setGuestReminderOpen}
          onContinueAsGuest={() => {
            setGuestReminderOpen(false)
            onStart()
          }}
          onLogin={() => {
            setGuestReminderOpen(false)
            const safeCallback = encodeURIComponent(`/quiz/${quizId}`)
            router.push(`/login?callbackUrl=${safeCallback}`)
          }}
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
  )
}
