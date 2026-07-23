'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { Flame, Lightbulb, ShieldCheck, Eye } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'

interface CommunitySidebarProps {
  postsData: any
  searchQuery: string
  setSearchQuery: (query: string) => void
  onOpenFeedback: () => void
}

export const CommunitySidebar = React.memo(function CommunitySidebar({
  postsData,
  searchQuery,
  setSearchQuery,
  onOpenFeedback,
}: CommunitySidebarProps) {
  return (
    <aside className="lg:col-span-4 space-y-6">
      {/* Widget 1: Featured Topics */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-black text-sm border-b border-slate-100 pb-3">
          <Flame className="w-4 h-4 text-amber-500" />
          <span>Chủ đề thảo luận nổi bật</span>
        </div>

        {postsData?.featuredTopics && postsData.featuredTopics.length > 0 ? (
          <div className="space-y-2">
            {postsData.featuredTopics.map((topic: { name: string; totalViews: number; postCount: number }) => {
              const isActive = searchQuery.toLowerCase() === topic.name.toLowerCase()
              return (
                <button
                  key={topic.name}
                  onClick={() => setSearchQuery(isActive ? '' : topic.name)}
                  className={cn(
                    'w-full flex items-center justify-between p-2.5 rounded-2xl transition-all cursor-pointer border text-xs font-bold text-left',
                    isActive
                      ? 'bg-[#5D7B6F] text-white border-[#5D7B6F] shadow-xs'
                      : 'bg-slate-50/90 text-slate-700 border-slate-200/70 hover:bg-emerald-50 hover:text-[#5D7B6F] hover:border-emerald-200'
                  )}
                >
                  <span className="truncate">#{topic.name}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full',
                      isActive ? 'bg-white/20 text-white' : 'bg-emerald-100/60 text-[#166534]'
                    )}>
                      <Eye className="w-3 h-3" /> {topic.totalViews}
                    </span>
                    <span className={cn(
                      'text-[10px] font-bold',
                      isActive ? 'text-emerald-100' : 'text-slate-400'
                    )}>
                      {topic.postCount} bài
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-xs font-medium text-slate-400 text-center py-2">
            Chưa có chủ đề hashtag nào
          </p>
        )}
      </div>

      {/* Widget 2: Feedback Promotion */}
      <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/60 border border-emerald-100 rounded-3xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-[#5D7B6F] font-black text-sm">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>Đóng góp ý kiến cho FQuiz</span>
        </div>
        <p className="text-xs font-medium text-slate-600 leading-relaxed">
          Bạn gặp phải sự cố kỹ thuật hoặc có ý tưởng tính năng mới? Đừng ngần ngại gửi feedback cho chúng tôi!
        </p>
        <Button
          onClick={onOpenFeedback}
          className="w-full bg-[#5D7B6F] hover:bg-[#4A6359] text-white rounded-xl font-bold text-xs py-2.5 shadow-xs"
        >
          Gửi góp ý ngay
        </Button>
      </div>

      {/* Widget 3: Community Guidelines */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-slate-800 font-black text-sm border-b border-slate-100 pb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Quy tắc văn hóa cộng đồng</span>
        </div>
        <ul className="space-y-2 text-xs font-medium text-slate-600">
          <li className="flex items-start gap-2">
            <span className="text-[#5D7B6F] font-bold">•</span>
            <span>Tôn trọng người dùng khác & không ngôn từ xúc phạm.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#5D7B6F] font-bold">•</span>
            <span>Đặt tiêu đề rõ ràng, đúng trọng tâm bài viết.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#5D7B6F] font-bold">•</span>
            <span>Không đăng tải nội dung quảng cáo hoặc rác.</span>
          </li>
        </ul>
      </div>
    </aside>
  )
})
