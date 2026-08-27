'use client'

import { useState, useRef, useEffect } from 'react'
import { Info, X } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { Badge } from '@/components/shared/ui/badge'

interface UsageBadgeProps {
  count?: number
  used_in_quizzes?: string[]
  currentCourseCode?: string
  size?: 'sm' | 'md'
  className?: string
  align?: 'left' | 'right' | 'center'
}

export function UsageBadge({
  used_in_quizzes = [],
  currentCourseCode,
  size = 'sm',
  className,
  align = 'right',
}: UsageBadgeProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const normalizedCurrentCode = (currentCourseCode || '').trim().toUpperCase()

  const uniqueQuizzes = Array.from(
    new Set(
      (used_in_quizzes || [])
        .map((c) => (typeof c === 'string' ? c.trim().toUpperCase() : ''))
        .filter((c) => c.length > 0 && !c.startsWith('MIX_') && !c.startsWith('TEMP_'))
    )
  )

  const displayCount = uniqueQuizzes.length

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setOpen((prev) => !prev)
  }

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: Event) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open])

  // Pure UI: If there are no public test codes linked, don't render misleading badge
  if (displayCount === 0) {
    return null
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border font-bold bg-primary/10 text-primary border-primary/20 shadow-2xs select-none',
          size === 'sm' ? 'px-2.5 py-0.5 text-[10px] sm:text-[10.5px]' : 'px-3 py-1 text-xs',
          className
        )}
      >
        <span className="truncate max-w-[200px] sm:max-w-none">
          Câu này đang có trong {displayCount} mã đề
        </span>
        <button
          type="button"
          onClick={toggleDropdown}
          className="inline-flex items-center justify-center p-0.5 rounded-full hover:bg-primary/20 transition-colors text-primary cursor-pointer focus:outline-none shrink-0"
          title="Xem danh sách mã đề"
          aria-label="Xem danh sách mã đề"
        >
          <Info className={cn('shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
        </button>
      </span>

      {/* Dropdown Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Mã đề liên quan"
          className={cn(
            'usage-badge-dropdown absolute top-full mt-1.5 z-50 w-64 max-w-[85vw] p-3 rounded-2xl bg-popover text-popover-foreground border-2 border-border shadow-xl animate-in fade-in slide-in-from-top-2 duration-200',
            align === 'center' ? 'left-1/2 -translate-x-1/2' : align === 'left' ? 'left-0' : 'right-0'
          )}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border pb-1.5 mb-2">
            <span className="text-[11px] font-bold text-foreground">
              Mã đề chứa câu hỏi này ({displayCount}):
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
            {uniqueQuizzes.map((code) => {
              const isCurrent = Boolean(normalizedCurrentCode && code === normalizedCurrentCode)
              return (
                <Badge
                  key={code}
                  variant={isCurrent ? 'default' : 'secondary'}
                  className={cn(
                    'px-2 py-0.5 text-[11px] font-bold rounded-md transition-all',
                    isCurrent
                      ? 'bg-primary text-primary-foreground border border-primary shadow-2xs'
                      : 'bg-primary/10 text-primary border border-primary/20'
                  )}
                >
                  {code} {isCurrent && <span className="ml-1 text-[9.5px] opacity-90">(Đề này)</span>}
                </Badge>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
