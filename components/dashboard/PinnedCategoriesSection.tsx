'use client'

import React, { useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Pin } from 'lucide-react'
import type { PinnedCategoryItem } from '@/hooks/useStudentDashboard'

interface PinnedCategoriesSectionProps {
  categories: PinnedCategoryItem[]
}

export const PinnedCategoriesSection = React.memo(function PinnedCategoriesSection({ categories }: PinnedCategoriesSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const dragDistanceRef = useRef(0)
  const [isGrabbing, setIsGrabbing] = useState(false)

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    isDraggingRef.current = true
    setIsGrabbing(true)
    startXRef.current = e.pageX - containerRef.current.offsetLeft
    scrollLeftRef.current = containerRef.current.scrollLeft
    dragDistanceRef.current = 0
  }

  const handleMouseLeave = () => {
    isDraggingRef.current = false
    setIsGrabbing(false)
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
    setIsGrabbing(false)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !containerRef.current) return
    const x = e.pageX - containerRef.current.offsetLeft
    const walk = (x - startXRef.current) * 1.5
    dragDistanceRef.current += Math.abs(x - startXRef.current)
    containerRef.current.scrollLeft = scrollLeftRef.current - walk
  }

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (dragDistanceRef.current > 6) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])

  if (!categories || categories.length === 0) return null

  return (
    <section className="space-y-3 w-full overflow-hidden">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Pin className="w-4 h-4 text-primary fill-primary" /> Môn Học Đã Ghim
        </h2>
        <Link href="/explore" className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors">
          Quản lý ghim
        </Link>
      </div>
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={`flex gap-3 sm:gap-3.5 overflow-x-auto pt-1.5 pb-3.5 px-0.5 scrollbar-thin custom-scrollbar snap-x snap-mandatory scroll-smooth w-full select-none ${
          isGrabbing ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/courses/${encodeURIComponent(cat.name.toLowerCase())}`}
            onClick={handleCardClick}
            className="group relative flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-card border border-border shadow-2xs hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 hover:z-10 active:scale-[0.98] transition-all duration-200 shrink-0 min-w-[150px] max-w-[200px] snap-start"
            title={cat.name}
          >
            <span className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <BookOpen className="w-4 h-4 text-primary transition-colors" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black text-card-foreground uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                {cat.name}
              </span>
              <span className="block text-[10px] font-bold text-muted-foreground mt-0.5">
                {cat.quizCount} đề thi
              </span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}
        {/* Trailing spacer to prevent last card from clipping on right edge when scrolling */}
        <div className="w-3 shrink-0 pointer-events-none" aria-hidden="true" />
      </div>
    </section>
  )
})
