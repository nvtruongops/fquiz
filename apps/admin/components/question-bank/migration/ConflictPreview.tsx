import React from 'react'
import { Badge } from '@/components/ui/badge'

interface ConflictPreviewProps {
  conflict: {
    question_id: string
    text: string
    variant_count: number
    variants: Array<{
      course_code: string
      correct_answer: number[]
      options: string[]
    }>
  }
}

export function ConflictPreview({ conflict }: ConflictPreviewProps) {
  return (
    <div className="border rounded-lg p-4 bg-destructive/5 border-destructive/20 text-card-foreground">
      <div className="flex items-start justify-between mb-2">
        <p className="font-medium text-card-foreground">{conflict.text}</p>
        <Badge variant="destructive">{conflict.variant_count} variants</Badge>
      </div>

      <div className="space-y-2 mt-3">
        {conflict.variants.slice(0, 3).map((variant, idx) => (
          <div key={idx} className="text-sm">
            <span className="font-medium text-card-foreground">{variant.course_code}:</span>{' '}
            <span className="text-muted-foreground">
              Đáp án:{' '}
              {variant.correct_answer.map((i) => variant.options[i]).join(', ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
