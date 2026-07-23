'use client'

import React from 'react'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { Trash2, Edit3, Loader2, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { AILearningLogItem } from '@/hooks/useAIHistory'

interface AIHistoryItemCardProps {
  item: AILearningLogItem
  onSelect: (item: AILearningLogItem) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    writing_eval: { label: 'Đánh giá Luyện Viết', bg: 'bg-[#5D7B6F]/10', text: 'text-[#5D7B6F]' },
    writing: { label: 'Đề Luyện Viết', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    vocabulary: { label: 'Tra Từ vựng', bg: 'bg-blue-50', text: 'text-blue-700' },
    grammar: { label: 'Giải thích Ngữ pháp', bg: 'bg-purple-50', text: 'text-purple-700' },
    paragraph: { label: 'Bài đọc theo chủ đề', bg: 'bg-amber-50', text: 'text-amber-700' },
    dialogue: { label: 'Kịch bản Hội thoại', bg: 'bg-teal-50', text: 'text-teal-700' },
    story: { label: 'Truyện ngắn học tập', bg: 'bg-indigo-50', text: 'text-indigo-700' },
    quiz: { label: 'Trắc nghiệm AI', bg: 'bg-rose-50', text: 'text-rose-700' },
    translation: { label: 'Dịch thuật', bg: 'bg-cyan-50', text: 'text-cyan-700' },
    flashcard: { label: 'Bộ thẻ Flashcards', bg: 'bg-[#5D7B6F]/15', text: 'text-[#5D7B6F]' },
  }

  const current = config[type] || { label: type, bg: 'bg-slate-100', text: 'text-slate-700' }

  return (
    <Badge variant="secondary" className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border-none whitespace-nowrap shrink-0 ${current.bg} ${current.text}`}>
      {current.label}
    </Badge>
  )
}

export const AIHistoryItemCard = React.memo(function AIHistoryItemCard({
  item,
  onSelect,
  onDelete,
  isDeleting,
}: AIHistoryItemCardProps) {
  const isWritingEval = item.type === 'writing_eval'
  const timeStr = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })

  return (
    <Card className="group relative w-full border border-slate-100 shadow-xs rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all duration-200">
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={item.type} />
            {item.language && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                {item.language}
              </span>
            )}
            {item.cefrLevel && (
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                {item.cefrLevel}
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug line-clamp-1">
            {item.title}
          </h3>

          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
            <span>{timeStr}</span>
            {item.topic && <span>• Chủ đề: {item.topic}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
          {isWritingEval && item.score !== undefined && (
            <div className="mr-2 text-right">
              <span className="text-[9px] font-black text-slate-400 uppercase block">Điểm số</span>
              <span className="text-base font-black text-[#5D7B6F]">{item.score}/100</span>
            </div>
          )}

          <Button
            onClick={() => onSelect(item)}
            className="rounded-xl px-4 py-2 h-9 bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold text-xs shadow-xs transition-all"
          >
            Xem chi tiết <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item._id)}
            disabled={isDeleting}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})
