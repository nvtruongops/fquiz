'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Zap, Bot, Sparkles, BookMarked } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'

interface LearningStudioGridProps {
  isDevOrAdmin?: boolean
}

export const LearningStudioGrid = React.memo(function LearningStudioGrid({ isDevOrAdmin }: LearningStudioGridProps) {
  return (
    <div className="lg:col-span-8 space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#5D7B6F]" /> Không Gian Luyện Tập
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Bento 1: Mix Quiz */}
        <div className="bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900 rounded-[24px] p-5 text-white shadow-xs flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Zap className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-black">Ôn Tập Ngẫu Nhiên (Mix Quiz)</h3>
              <p className="text-xs text-emerald-100/90 leading-relaxed mt-1.5 font-medium">
                Trộn câu hỏi ngẫu nhiên từ nhiều môn học để rèn phản xạ và kiểm tra toàn diện.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs h-9 rounded-xl mt-4 shadow-sm w-fit relative z-10">
            <Link href="/explore?tab=mix">
              Tạo đề ngẫu nhiên <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* Bento 2: AI Studio (Conditional) */}
        {isDevOrAdmin ? (
          <div className="bg-gradient-to-br from-indigo-700 via-blue-700 to-indigo-900 rounded-[24px] p-5 text-white shadow-xs flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <h3 className="text-base font-black">AI Studio Học Tập</h3>
                <p className="text-xs text-blue-100/90 leading-relaxed mt-1.5 font-medium">
                  Sinh từ vựng, đoạn văn, ngữ pháp & giải thích đáp án bằng trí tuệ nhân tạo.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-white text-blue-900 hover:bg-blue-50 font-black text-xs h-9 rounded-xl mt-4 shadow-sm w-fit relative z-10">
              <Link href="/ai">
                Khám phá AI Studio <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        ) : null}

        {/* Bento 3: Community */}
        <div className="bg-gradient-to-br from-purple-700 via-violet-700 to-purple-900 rounded-[24px] p-5 text-white shadow-xs flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h3 className="text-base font-black">Diễn Đàn Cộng Đồng</h3>
              <p className="text-xs text-purple-100/90 leading-relaxed mt-1.5 font-medium">
                Đặt câu hỏi, thảo luận bài tập & chia sẻ kinh nghiệm học tập cùng sinh viên.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-white text-purple-900 hover:bg-purple-50 font-black text-xs h-9 rounded-xl mt-4 shadow-sm w-fit relative z-10">
            <Link href="/community">
              Vào diễn đàn <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* Bento 4: CEFR Language Learning Courses (Conditional) */}
        {isDevOrAdmin ? (
          <div className="bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 rounded-[24px] p-5 text-white shadow-xs flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <BookMarked className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <h3 className="text-base font-black">Khóa Học Ngôn Ngữ CEFR</h3>
                <p className="text-xs text-amber-100/90 leading-relaxed mt-1.5 font-medium">
                  Học theo lộ trình bài học chuẩn CEFR (A1-C2) kết hợp thuật toán lặp lại ngắt quãng (FSRS).
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-white text-orange-950 hover:bg-amber-50 font-black text-xs h-9 rounded-xl mt-4 shadow-sm w-fit relative z-10">
              <Link href="/explore">
                Học theo khóa học <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
})
