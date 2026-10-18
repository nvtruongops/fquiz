'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'

interface MobileSessionFooterProps {
  isRightHanded: boolean
  effectiveIndex: number
  effectiveTotal: number
  onNavigate: (index: number) => void
  onSubmit: () => void
  submitDisabled?: boolean
}

export function MobileSessionFooter({
  isRightHanded,
  effectiveIndex,
  effectiveTotal,
  onNavigate,
  onSubmit,
  submitDisabled,
}: MobileSessionFooterProps) {
  return (
    <footer className="sticky bottom-0 z-10 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg text-card-foreground">
      <div className="flex items-center gap-2">
        {isRightHanded && (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled}
            className="h-12 flex-1 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
          >
            <span>Submit</span>
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          disabled={effectiveIndex <= 0}
          onClick={() => onNavigate(effectiveIndex - 1)}
          className="h-12 flex-1 rounded-xl font-bold border-border text-card-foreground cursor-pointer disabled:opacity-40"
        >
          <ChevronLeft aria-hidden="true" className="mr-1 h-5 w-5" />
          <span>Previous</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={effectiveIndex >= effectiveTotal - 1}
          onClick={() => onNavigate(effectiveIndex + 1)}
          className="h-12 flex-1 rounded-xl font-bold border-border text-card-foreground cursor-pointer disabled:opacity-40"
        >
          <span>Next</span>
          <ChevronRight aria-hidden="true" className="ml-1 h-5 w-5" />
        </Button>

        {!isRightHanded && (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled}
            className="h-12 flex-1 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
          >
            <span>Submit</span>
          </Button>
        )}
      </div>
    </footer>
  )
}
