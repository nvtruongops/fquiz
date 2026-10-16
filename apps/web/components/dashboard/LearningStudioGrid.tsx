'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Compass, Sparkles, Layers, MessageSquare, BrainCircuit, GraduationCap, Clock, School } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

interface LearningStudioGridProps {
  isDevOrAdmin?: boolean
}

export const LearningStudioGrid = React.memo(function LearningStudioGrid({}: LearningStudioGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)

  const { contextSafe } = useGSAP({ scope: gridRef })

  useGSAP(() => {
    if (!gridRef.current) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const cards = gridRef.current?.querySelectorAll('.bento-card')
      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 20, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.4, stagger: 0.08, ease: 'power2.out' }
        )
      }
    })
    return () => mm.revert()
  }, { scope: gridRef })

  const handleCardMouseEnter = contextSafe((e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.to(e.currentTarget, { scale: 1.015, y: -3, duration: 0.25, ease: 'power2.out' })
  })

  const handleCardMouseLeave = contextSafe((e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.25, ease: 'power2.out' })
  })

  return (
    <div ref={gridRef} className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-wider text-text-tertiary flex items-center gap-2">
          <Sparkles aria-hidden="true" className="w-4 h-4 text-primary" /> Learning Studio & Classrooms
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        {/* Bento 1: Explore Quizzes (Feature Hero Card — Col 7/12) */}
        <div
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          className="bento-card sm:col-span-7 glass-card text-foreground rounded-[24px] p-6 shadow-xs flex flex-col justify-between group transition-all duration-300 relative overflow-hidden border border-subtle hover:border-primary/50 hover:shadow-lg min-h-[220px]"
        >
          <div className="space-y-3.5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                <Compass aria-hidden="true" className="w-5 h-5" />
              </div>
              <Badge className="bg-primary/10 text-primary border border-primary/20 font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full">
                Explore Quizzes
              </Badge>
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground tracking-tight">Explore & Practice Quizzes</h3>
              <p className="text-xs text-text-secondary leading-relaxed mt-1.5 font-medium">
                Rich collection of multiple-choice quizzes across subjects, supporting timed exams and flashcards.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-bold border-subtle text-text-tertiary">
                <Layers aria-hidden="true" className="w-3 h-3 mr-1 text-primary inline" /> Multiple Subjects
              </Badge>
              <Badge variant="outline" className="text-[10px] font-bold border-subtle text-text-tertiary">
                <BrainCircuit aria-hidden="true" className="w-3 h-3 mr-1 text-primary inline" /> Random Mix
              </Badge>
            </div>
          </div>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-black text-xs h-10 sm:h-11 rounded-xl mt-5 shadow-xs w-fit relative z-10 cursor-pointer active:scale-[0.98] transition-transform">
            <Link href="/explore">
              Explore Now <ArrowRight aria-hidden="true" className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* Bento 2: Classrooms (Col 5/12) */}
        <div
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          className="bento-card sm:col-span-5 glass-card text-foreground rounded-[24px] p-6 shadow-xs flex flex-col justify-between group transition-all duration-300 relative overflow-hidden border border-subtle hover:border-primary/50 hover:shadow-lg min-h-[220px]"
        >
          <div className="space-y-3.5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                <GraduationCap aria-hidden="true" className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary bg-primary/10">
                <School aria-hidden="true" className="w-3 h-3 mr-1 inline" /> Classroom
              </Badge>
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">My Classrooms</h3>
              <p className="text-xs text-text-secondary leading-relaxed mt-1 font-medium">
                Join teacher classrooms, receive assignments, and track your practice results.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-black text-xs h-10 sm:h-11 rounded-xl mt-4 shadow-xs w-fit relative z-10 cursor-pointer active:scale-[0.98] transition-transform">
            <Link href="/student/classrooms">
              Enter Classrooms <ArrowRight aria-hidden="true" className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* Bento 3: Quiz History (Col 6/12) */}
        <div
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          className="bento-card sm:col-span-6 glass-card text-foreground rounded-[24px] p-6 shadow-xs flex flex-col justify-between group transition-all duration-300 relative overflow-hidden border border-subtle hover:border-primary/50 hover:shadow-lg min-h-[190px]"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                <Clock aria-hidden="true" className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-subtle text-text-tertiary">
                Progress
              </Badge>
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Quiz History</h3>
              <p className="text-xs text-text-secondary leading-relaxed mt-1 font-medium">
                Track study progress, review scorecards, and retry previously missed questions.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="font-bold text-xs h-10 sm:h-11 rounded-xl mt-3 w-fit relative z-10 cursor-pointer hover:bg-muted active:scale-[0.98] transition-transform">
            <Link href="/history">
              View History <ArrowRight aria-hidden="true" className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* Bento 4: Community Forum (Col 6/12) */}
        <div
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          className="bento-card sm:col-span-6 glass-card text-foreground rounded-[24px] p-6 shadow-xs flex flex-col justify-between group transition-all duration-300 relative overflow-hidden border border-subtle hover:border-primary/50 hover:shadow-lg min-h-[190px]"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                <MessageSquare aria-hidden="true" className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-subtle text-text-tertiary">
                Discussions
              </Badge>
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Community Forum</h3>
              <p className="text-xs text-text-secondary leading-relaxed mt-1 font-medium">
                Discuss solutions, ask questions, and share knowledge with fellow learners.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="font-bold text-xs h-10 sm:h-11 rounded-xl mt-3 w-fit relative z-10 cursor-pointer hover:bg-muted active:scale-[0.98] transition-transform">
            <Link href="/community">
              Join Forum <ArrowRight aria-hidden="true" className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
})
