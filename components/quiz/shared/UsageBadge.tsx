'use client'

import { cn } from '@/lib/core/utils/cn'

interface UsageBadgeProps {
  count: number
  size?: 'sm' | 'md'
}

const LEVELS = [
  { max: 2, label: 'Cơ bản', color: 'text-green-700 bg-green-50 border-green-200' },
  { max: 4, label: 'Phổ biến', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { max: 5, label: 'Trọng tâm', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  { max: Infinity, label: 'Rất phổ biến', color: 'text-red-700 bg-red-50 border-red-200' },
]

function getLevel(count: number) {
  return LEVELS.find((l) => count <= l.max) ?? LEVELS[LEVELS.length - 1]
}

export function UsageBadge({ count, size = 'sm' }: UsageBadgeProps) {
  if (!count || count <= 0) return null

  const level = getLevel(count)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        level.color,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      )}
    >
      <span>
        {count} đề · {level.label}
      </span>
    </span>
  )
}
