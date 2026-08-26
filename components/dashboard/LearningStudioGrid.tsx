'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Compass, Sparkles, Layers, MessageSquare, BrainCircuit, GraduationCap, FileText, School } from 'lucide-react'
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
          <Sparkles className="w-4 h-4 text-primary" /> Không Gian Ôn Luyện & Lớp Học
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        {/* Bento 1: Khám Phá Đề Thi (Feature Hero Card — Col 7/12) */}
        <div
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          className="bento-card sm:col-span-7 glass-card text-foreground rounded-[24px] p-6 shadow-xs flex flex-col justify-between group transition-all duration-300 relative overflow-hidden border border-subtle hover:border-primary/50 hover:shadow-lg min-h-[220px]"
        >
          <div className="space-y-3.5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                <Compass className="w-5 h-5" />
              </div>
              <Badge className="bg-primary/10 text-primary border border-primary/20 font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full">
                Khám phá đề thi
              </Badge>
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground tracking-tight">Khám Phá & Làm Đề Thi</h3>
              <p className="text-xs text-text-secondary leading-relaxed mt-1.5 font-medium">
                Kho đề thi trắc nghiệm phong phú nhiều môn học, hỗ trợ chế độ thi thử tính giờ và thẻ ghi nhớ flashcard.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-bold border-subtle text-text-tertiary">
                <Layers className="w-3 h-3 mr-1 text-primary inline" /> Đa dạng môn
              </Badge>
              <Badge variant="outline" className="text-[10px] font-bold border-subtle text-text-tertiary">
                <BrainCircuit className="w-3 h-3 mr-1 text-primary inline" /> Trộn ngẫu nhiên
              </Badge>
            </div>
          </div>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-black text-xs h-10 rounded-xl mt-5 shadow-xs w-fit relative z-10 cursor-pointer">
            <Link href="/explore">
              Khám phá ngay <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* Bento 2: Lớp Học & Bài Tập (Col 5/12) */}
        <div
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          className="bento-card sm:col-span-5 glass-card text-foreground rounded-[24px] p-6 shadow-xs flex flex-col justify-between group transition-all duration-300 relative overflow-hidden border border-subtle hover:border-primary/50 hover:shadow-lg min-h-[220px]"
        >
          <div className="space-y-3.5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary bg-primary/10">
                <School className="w-3 h-3 mr-1 inline" /> Lớp học
              </Badge>
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Lớp Học Của Tôi</h3>
              <p className="text-xs text-text-secondary leading-relaxed mt-1 font-medium">
                Tham gia lớp học của giáo viên, nhận bài tập được giao và theo dõi kết quả làm bài.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-black text-xs h-10 rounded-xl mt-4 shadow-xs w-fit relative z-10 cursor-pointer">
            <Link href="/student/classrooms">
              Vào lớp học <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* Bento 3: Bộ Đề Của Tôi (Col 6/12) */}
        <div
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          className="bento-card sm:col-span-6 glass-card text-foreground rounded-[24px] p-6 shadow-xs flex flex-col justify-between group transition-all duration-300 relative overflow-hidden border border-subtle hover:border-primary/50 hover:shadow-lg min-h-[190px]"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-subtle text-text-tertiary">
                Đã lưu
              </Badge>
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Bộ Đề Đã Lưu</h3>
              <p className="text-xs text-text-secondary leading-relaxed mt-1 font-medium">
                Tập trung luyện tập các bộ đề yêu thích được lưu từ thư viện chung.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="font-bold text-xs h-9 rounded-xl mt-3 w-fit relative z-10 cursor-pointer hover:bg-muted">
            <Link href="/my-quizzes">
              Xem bộ đề <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* Bento 4: Diễn Đàn Cộng Đồng (Col 6/12) */}
        <div
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          className="bento-card sm:col-span-6 glass-card text-foreground rounded-[24px] p-6 shadow-xs flex flex-col justify-between group transition-all duration-300 relative overflow-hidden border border-subtle hover:border-primary/50 hover:shadow-lg min-h-[190px]"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                <MessageSquare className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-subtle text-text-tertiary">
                Thảo luận
              </Badge>
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Diễn Đàn Cộng Đồng</h3>
              <p className="text-xs text-text-secondary leading-relaxed mt-1 font-medium">
                Trao đổi, thảo luận lời giải và hỏi đáp câu hỏi trắc nghiệm cùng cộng đồng.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="font-bold text-xs h-9 rounded-xl mt-3 w-fit relative z-10 cursor-pointer hover:bg-muted">
            <Link href="/community">
              Vào diễn đàn <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
})
