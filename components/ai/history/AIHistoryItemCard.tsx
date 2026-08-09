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
  return (
    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border-none whitespace-nowrap shrink-0 bg-primary/10 text-primary">
      {type.toUpperCase().replace('_', ' ')}
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
    <Card className="group relative w-full border border-border shadow-xs rounded-2xl overflow-hidden bg-card text-card-foreground hover:shadow-md transition-all duration-200">
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={item.type} />
            {item.language && (
              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md uppercase">
                {item.language}
              </span>
            )}
            {item.cefrLevel && (
              <span className="text-[10px] font-extrabold text-success-fg bg-success-bg px-2 py-0.5 rounded-md">
                {item.cefrLevel}
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-black text-card-foreground leading-snug line-clamp-1">
            {item.title}
          </h3>

          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
            <span>{timeStr}</span>
            {item.topic && <span>• Chủ đề: {item.topic}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border justify-end">
          {isWritingEval && item.score !== undefined && (
            <div className="mr-2 text-right">
              <span className="text-[9px] font-black text-muted-foreground uppercase block">Điểm số</span>
              <span className="text-base font-black text-primary">{item.score}/100</span>
            </div>
          )}

          <Button
            onClick={() => onSelect(item)}
            className="rounded-xl px-4 py-2 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            Xem chi tiết <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item._id)}
            disabled={isDeleting}
            className="w-9 h-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})
