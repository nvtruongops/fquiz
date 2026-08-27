import React from 'react'
import { Button } from '@/components/ui/button'

interface AnalyticsPaginationProps {
  currentPage: number
  totalPages: number
  loading: boolean
  onPageChange: (page: number) => void
}

export function AnalyticsPagination({
  currentPage,
  totalPages,
  loading,
  onPageChange,
}: AnalyticsPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-border">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
      >
        Trước
      </Button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((page) => {
            return (
              page === 1 ||
              page === totalPages ||
              Math.abs(page - currentPage) <= 1
            )
          })
          .map((page, idx, arr) => {
            const prevPage = arr[idx - 1]
            const showEllipsis = prevPage && page - prevPage > 1

            return (
              <div key={page} className="flex items-center gap-1">
                {showEllipsis && (
                  <span className="px-2 text-muted-foreground">...</span>
                )}
                <Button
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  disabled={loading}
                  className="min-w-[40px]"
                >
                  {page}
                </Button>
              </div>
            )
          })}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || loading}
      >
        Sau
      </Button>
    </div>
  )
}
