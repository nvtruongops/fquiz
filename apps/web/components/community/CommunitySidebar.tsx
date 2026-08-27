'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { Flame, Lightbulb, Eye } from 'lucide-react'
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
      <div className="bg-card backdrop-blur-xl border border-border rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-foreground font-black text-sm border-b border-border pb-3">
          <Flame className="w-4 h-4 text-amber-400" />
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
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                  )}
                >
                  <span className="truncate">#{topic.name}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full',
                      isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                    )}>
                      <Eye className="w-3 h-3" /> {topic.totalViews}
                    </span>
                    <span className={cn(
                      'text-[10px] font-bold',
                      isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    )}>
                      {topic.postCount} bài
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-xs font-medium text-muted-foreground text-center py-2">
            Chưa có chủ đề hashtag nào
          </p>
        )}
      </div>

      {/* Widget 2: Feedback Promotion */}
      <div className="bg-card border border-primary/20 rounded-3xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-primary font-black text-sm">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span>Đóng góp ý kiến cho FQuiz</span>
        </div>
        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
          Bạn gặp phải sự cố kỹ thuật hoặc có ý tưởng tính năng mới? Đừng ngần ngại gửi feedback cho chúng tôi!
        </p>
        <Button
          onClick={onOpenFeedback}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-xs py-2.5 shadow-xs"
        >
          Gửi góp ý ngay
        </Button>
      </div>
    </aside>
  )
})

