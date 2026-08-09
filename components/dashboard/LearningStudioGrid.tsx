'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Compass, Zap, Bot, Sparkles, BookMarked, Layers, MessageSquare, BrainCircuit } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

interface LearningStudioGridProps {
  isDevOrAdmin?: boolean
}

export const LearningStudioGrid = React.memo(function LearningStudioGrid({ isDevOrAdmin }: LearningStudioGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)

  const { contextSafe } = useGSAP({ scope: gridRef })

  useGSAP(() => {
    if (!gridRef.current) return
    const cards = gridRef.current.querySelectorAll('.bento-card')
    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        { y: 20, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.4, stagger: 0.08, ease: 'power2.out' }
      )
    }
  }, { scope: gridRef })

  const handleCardMouseEnter = contextSafe((e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, { scale: 1.015, y: -3, duration: 0.25, ease: 'power2.out' })
  })

  const handleCardMouseLeave = contextSafe((e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.25, ease: 'power2.out' })
  })

  return (
    <div ref={gridRef} className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-wider text-text-tertiary flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accentRole-learning" /> Không Gian Luyện Tập & Sáng Tạo
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        {/* Bento 1: Khám Phá Đề Thi (Feature Hero Card — Discovery Indigo Rail) */}
        <div
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          className="bento-card sm:col-span-7 bg-surface-card text-foreground rounded-[28px] p-6 shadow-xs flex flex-col justify-between group transition-all duration-300 relative overflow-hidden border border-subtle hover:border-strong min-h-[220px] before:w-1.5 before:bg-accentRole-discovery before:absolute before:left-0 before:top-4 before:bottom-4 before:rounded-r-full"
        >
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-accentRole-discovery/10 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-3.5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-accentRole-discovery-bg text-accentRole-discovery-fg border border-accentRole-discovery-border flex items-center justify-center shadow-xs">
                <Compass className="w-5 h-5" />
              </div>
              <Badge className="bg-accentRole-discovery-bg text-accentRole-discovery-fg border border-accentRole-discovery-border font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full">
                HOT • Khám phá đề thi
              </Badge>
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground tracking-tight">Khám Phá Đề Thi & Ôn Tập</h3>
              <p className="text-xs text-text-secondary leading-relaxed mt-1.5 font-medium">
                Khám phá hàng ngàn đề thi trắc nghiệm chất lượng cao từ nhiều môn học, làm bài thi thử hoặc ôn tập trộn ngẫu nhiên.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="outline" className="text-[10px] font-bold border-subtle text-text-tertiary">
                <Layers className="w-3 h-3 mr-1 text-accentRole-discovery inline" /> Đa dạng môn
              </Badge>
              <Badge variant="outline" className="text-[10px] font-bold border-subtle text-text-tertiary">
                <BrainCircuit className="w-3 h-3 mr-1 text-accentRole-discovery inline" /> Trộn ngẫu nhiên
              </Badge>
            </div>
          </div>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover font-black text-xs h-10 rounded-xl mt-5 shadow-xs w-fit relative z-10 cursor-pointer">
            <Link href="/explore">
              Khám phá ngay <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* Bento 2: AI Studio (Spotlight Card — Learning Blue Rail) */}
        {isDevOrAdmin ? (
          <div
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            className="bento-card sm:col-span-5 bg-surface-card text-foreground rounded-[28px] p-6 shadow-xs flex flex-col justify-between group transition-all duration-300 relative overflow-hidden border border-subtle hover:border-strong min-h-[220px] before:w-1.5 before:bg-accentRole-learning before:absolute before:left-0 before:top-4 before:bottom-4 before:rounded-r-full"
          >
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-accentRole-learning/10 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-3.5 relative z-10">
              <div className="w-11 h-11 rounded-2xl bg-accentRole-learning-bg text-accentRole-learning-fg border border-accentRole-learning-border flex items-center justify-center shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-foreground">AI Studio Học Tập</h3>
                <p className="text-xs text-text-secondary leading-relaxed mt-1 font-medium">
                  Sinh từ vựng, ngữ pháp & giải thích đáp án bằng AI.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-surface-inset text-text-tertiary">Từ vựng</span>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-surface-inset text-text-tertiary">Ngữ pháp</span>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-surface-inset text-text-tertiary">Đoạn văn</span>
              </div>
            </div>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover font-black text-xs h-10 rounded-xl mt-4 shadow-xs w-fit relative z-10">
              <Link href="/ai">
                Khám phá AI Studio <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <div
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            className="bento-card sm:col-span-5 bg-surface-card text-foreground rounded-[28px] p-6 shadow-xs flex flex-col justify-between group transition-all duration-300 relative overflow-hidden border border-subtle hover:border-strong min-h-[220px] before:w-1.5 before:bg-accentRole-community before:absolute before:left-0 before:top-4 before:bottom-4 before:rounded-r-full"
          >
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-accentRole-community/10 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-3.5 relative z-10">
              <div className="w-11 h-11 rounded-2xl bg-accentRole-community-bg text-accentRole-community-fg border border-accentRole-community-border flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-foreground">Diễn Đàn Cộng Đồng</h3>
                <p className="text-xs text-text-secondary leading-relaxed mt-1 font-medium">
                  Đặt câu hỏi, thảo luận bài tập & chia sẻ kinh nghiệm học tập.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover font-black text-xs h-10 rounded-xl mt-4 shadow-xs w-fit relative z-10">
              <Link href="/community">
                Vào diễn đàn <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        )}

        {/* Bento 3: Community Forum (Spans 6 columns — Community Rose Rail) */}
        {isDevOrAdmin && (
          <div
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            className="bento-card sm:col-span-6 bg-surface-card text-foreground rounded-[28px] p-6 shadow-xs flex flex-col justify-between group transition-all duration-300 relative overflow-hidden border border-subtle hover:border-strong before:w-1.5 before:bg-accentRole-community before:absolute before:left-0 before:top-4 before:bottom-4 before:rounded-r-full"
          >
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-accentRole-community-bg text-accentRole-community-fg border border-accentRole-community-border flex items-center justify-center shadow-xs">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold border-accentRole-community-border text-accentRole-community-fg bg-accentRole-community-subtle">
                  <MessageSquare className="w-3 h-3 mr-1 inline" /> Thảo luận mở
                </Badge>
              </div>
              <div>
                <h3 className="text-base font-black text-foreground">Diễn Đàn Cộng Đồng</h3>
                <p className="text-xs text-text-secondary leading-relaxed mt-1.5 font-medium">
                  Đặt câu hỏi, thảo luận bài tập & chia sẻ kinh nghiệm học tập cùng sinh viên.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover font-black text-xs h-10 rounded-xl mt-4 shadow-xs w-fit relative z-10">
              <Link href="/community">
                Vào diễn đàn <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        )}

        {/* Bento 4: CEFR Language Pathway (Spans 6 columns — Memory Violet Rail) */}
        {isDevOrAdmin && (
          <div
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            className="bento-card sm:col-span-6 bg-surface-card text-foreground rounded-[28px] p-6 shadow-xs flex flex-col justify-between group transition-all duration-300 relative overflow-hidden border border-subtle hover:border-strong before:w-1.5 before:bg-accentRole-memory before:absolute before:left-0 before:top-4 before:bottom-4 before:rounded-r-full"
          >
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-accentRole-memory-bg text-accentRole-memory-fg border border-accentRole-memory-border flex items-center justify-center shadow-xs">
                  <BookMarked className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1">
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => (
                    <span key={level} className="text-[9px] font-black px-1.5 py-0.5 rounded bg-accentRole-memory-subtle text-accentRole-memory-fg border border-accentRole-memory-border/40">
                      {level}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-base font-black text-foreground">Khóa Học Ngôn Ngữ CEFR</h3>
                <p className="text-xs text-text-secondary leading-relaxed mt-1.5 font-medium">
                  Lộ trình chuẩn khung CEFR (A1-C2) kết hợp thuật toán lặp lại ngắt quãng FSRS.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover font-black text-xs h-10 rounded-xl mt-4 shadow-xs w-fit relative z-10">
              <Link href="/explore">
                Học theo khóa học <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
})
