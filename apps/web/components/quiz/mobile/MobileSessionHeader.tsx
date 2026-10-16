'use client'

import React from 'react'
import { Menu, PenTool, Hand, XCircle } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { QuizTimer } from '@/components/quiz/shared/QuizTimer'
import { cn } from '@/lib/core/utils/cn'

interface MobileSessionHeaderProps {
  categoryName?: string
  courseCode?: string
  isDevOrAdmin: boolean
  isNoteMode: boolean
  toggleNoteMode: () => void
  isRightHanded: boolean
  toggleHandedness: () => void
  startedAt?: string | Date
  pausedAt?: string | null
  totalPausedDurationMs?: number
  sessionId: string
  answeredCount: number
  effectiveTotal: number
  onOpenQuestionMap: () => void
  onOpenExitConfirm: () => void
}

export function MobileSessionHeader({
  categoryName,
  courseCode,
  isDevOrAdmin,
  isNoteMode,
  toggleNoteMode,
  isRightHanded,
  toggleHandedness,
  startedAt,
  pausedAt,
  totalPausedDurationMs,
  sessionId,
  answeredCount,
  effectiveTotal,
  onOpenQuestionMap,
  onOpenExitConfirm,
}: MobileSessionHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card shadow-sm text-card-foreground pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between px-2 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenQuestionMap}
            aria-label="Open question navigation map"
            className="h-11 w-11 rounded-xl bg-muted text-primary hover:bg-muted/80 cursor-pointer shrink-0"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{categoryName}</p>
            <p className="text-sm font-black text-primary">{courseCode}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDevOrAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleNoteMode}
              aria-label="Toggle vocabulary lookup pen"
              aria-pressed={isNoteMode}
              title={
                isNoteMode
                  ? 'Vocabulary Lookup Pen ON (Click to return to quiz)'
                  : 'Enable Vocabulary Lookup Pen (Highlight text without selecting answers)'
              }
              className={cn(
                'h-11 w-11 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0',
                isNoteMode
                  ? 'bg-warning-bg text-warning-fg border border-warning-border shadow-sm animate-pulse'
                  : 'bg-warning-bg/50 text-warning-fg hover:bg-warning-bg border border-warning-border/40'
              )}
            >
              <PenTool aria-hidden="true" className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleHandedness}
            aria-label="Toggle handedness"
            aria-pressed={isRightHanded}
            title={
              isRightHanded
                ? 'Right-handed mode (Click to switch to Left)'
                : 'Left-handed mode (Click to switch to Right)'
            }
            className={cn(
              'h-11 w-11 rounded-xl transition-all flex items-center justify-center gap-0.5 cursor-pointer shrink-0',
              isRightHanded
                ? 'bg-warning-bg text-warning-fg border border-warning-border shadow-sm'
                : 'bg-muted text-primary hover:bg-muted/80 border border-transparent'
            )}
          >
            <Hand aria-hidden="true" className={cn('h-4 w-4 transition-transform duration-200', !isRightHanded ? 'scale-x-[-1]' : '')} />
            <span className="text-[9px] font-black tracking-tighter uppercase">{isRightHanded ? 'R' : 'L'}</span>
          </Button>

          <div className="flex flex-col items-end">
            <QuizTimer
              startedAt={startedAt ?? new Date().toISOString()}
              pausedAt={pausedAt ?? undefined}
              totalPausedDurationMs={totalPausedDurationMs}
              sessionId={sessionId}
              className="text-primary text-sm"
            />
            <p className="text-[10px] font-bold text-muted-foreground">
              {answeredCount}/{effectiveTotal} answered
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenExitConfirm}
            aria-label="Exit quiz session"
            className="h-11 w-11 rounded-xl bg-incorrect-bg text-destructive hover:bg-incorrect-bg/80 cursor-pointer shrink-0"
          >
            <XCircle aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div
        className="h-1 w-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={answeredCount}
        aria-valuemin={0}
        aria-valuemax={effectiveTotal}
        aria-label="Session progress"
      >
        <div
          className="h-full w-full bg-primary origin-left transition-transform duration-300 ease-out will-change-transform"
          style={{ transform: `scaleX(${answeredCount / Math.max(effectiveTotal, 1)})` }}
        />
      </div>
    </header>
  )
}
