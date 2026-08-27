import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Save, Loader2 } from 'lucide-react'

interface QuizEditorStickyActionBarProps {
  isSubmitting: boolean
  submitAction: 'published' | 'draft'
  isCategorySelected: boolean
  isFormValid: boolean
  onSubmit: (action: 'published' | 'draft') => void
}

export function QuizEditorStickyActionBar({
  isSubmitting,
  submitAction,
  isCategorySelected,
  isFormValid,
  onSubmit,
}: QuizEditorStickyActionBarProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-border sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border">
      <Link href="/quizzes">
        <Button type="button" variant="outline" className="cursor-pointer">
          Hủy bỏ
        </Button>
      </Link>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting || !isCategorySelected}
          onClick={() => onSubmit('draft')}
          className="cursor-pointer font-medium"
        >
          {isSubmitting && submitAction === 'draft' ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Lưu nháp (Draft)
        </Button>

        <Button
          type="button"
          disabled={isSubmitting || !isFormValid}
          onClick={() => onSubmit('published')}
          className="font-bold gap-2 min-w-36 cursor-pointer"
        >
          {isSubmitting && submitAction === 'published' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Xuất bản Đề thi
        </Button>
      </div>
    </div>
  )
}
