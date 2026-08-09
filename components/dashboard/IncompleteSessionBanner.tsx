'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Flame } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import type { ActivityItem } from '@/hooks/useStudentDashboard'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

interface IncompleteSessionBannerProps {
  item: ActivityItem
}

export const IncompleteSessionBanner = React.memo(function IncompleteSessionBanner({ item }: IncompleteSessionBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const resumeSessionId = item.activeSessionId || item.id
  const isFlashcardMode = item.mode === 'flashcard'
  const resumeHref = `/quiz/${item.quizId}/session/${resumeSessionId}${isFlashcardMode ? '/flashcard' : ''}`
  const answeredCount = item.hasActiveSession ? (item.activeAnsweredCount ?? 0) : (item.correctCount ?? 0)
  const totalCount = item.hasActiveSession ? (item.activeTotalCount ?? 0) : (item.totalCount ?? 0)

  const { contextSafe } = useGSAP({ scope: containerRef })

  const handleMouseEnter = contextSafe(() => {
    if (containerRef.current) {
      gsap.to(containerRef.current, { scale: 1.01, y: -2, duration: 0.25, ease: 'power2.out' })
    }
  })

  const handleMouseLeave = contextSafe(() => {
    if (containerRef.current) {
      gsap.to(containerRef.current, { scale: 1, y: 0, duration: 0.25, ease: 'power2.out' })
    }
  })

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden rounded-[28px] bg-card text-foreground p-5 sm:p-6 border border-border hover:border-ring shadow-sm flex flex-col justify-between gap-4 select-none h-full w-full"
    >
      {/* Ambient Soft Glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start gap-3.5 min-w-0 relative z-10">
        <div className="w-11 h-11 rounded-2xl bg-warning-bg border border-warning-border flex items-center justify-center shrink-0 shadow-xs">
          <Flame className="w-6 h-6 text-warning-fg animate-bounce" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-warning-fg bg-warning-bg px-2.5 py-0.5 rounded-full border border-warning-border">
              Chưa hoàn thành • {item.quizCode}
            </span>
            {totalCount > 0 ? (
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border/40">
                {answeredCount}/{totalCount} câu
              </span>
            ) : null}
          </div>
          <h3 className="text-sm font-black truncate text-foreground leading-tight">{item.quizTitle}</h3>
        </div>
      </div>

      <Button asChild size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground font-black rounded-xl text-xs h-10 px-5 w-full sm:w-fit shrink-0 shadow-xs relative z-10 transition-colors mt-2">
        <Link href={resumeHref}>
          Tiếp tục ngay <ArrowRight className="w-4 h-4 ml-1.5" />
        </Link>
      </Button>
    </div>
  )
})
