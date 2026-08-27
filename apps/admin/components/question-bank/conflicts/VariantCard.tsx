import React from 'react'
import { Badge } from '@/components/ui/badge'

interface VariantCardProps {
  group: {
    correct_answer: number[]
    count: number
    quizzes: string[]
    sample_variant: {
      options: string[]
      correct_answer: number[]
      explanation?: string
    }
  }
  selected: boolean
  onClick: () => void
}

export function VariantCard({ group, selected, onClick }: VariantCardProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        selected
          ? 'bg-success-bg border-success-border ring-2 ring-success-border'
          : 'bg-card border-border hover:bg-muted'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={selected ? 'default' : 'secondary'}>
            {group.count} quiz dùng đáp án này
          </Badge>
          {selected && <span className="text-success-fg font-bold text-sm">✓ Đã chọn</span>}
        </div>
      </div>

      <div className="space-y-1.5">
        {group.sample_variant.options.map((option, idx) => {
          const isCorrect = group.correct_answer.includes(idx)
          return (
            <div
              key={idx}
              className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 ${
                isCorrect
                  ? 'bg-success-bg border-success-border font-semibold text-success-fg'
                  : 'bg-muted/40 border-border text-card-foreground'
              }`}
            >
              <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                isCorrect ? 'bg-success-fg text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {String.fromCodePoint(65 + idx)}
              </span>
              <span className="flex-1">{option}</span>
              {isCorrect && <span className="text-success-fg text-xs font-bold">✓</span>}
            </div>
          )
        })}
      </div>

      {group.sample_variant.explanation && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Giải thích:</p>
          <p className="text-xs text-card-foreground">{group.sample_variant.explanation}</p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground mb-1 font-medium">
          Đáp án này đang dùng trong:
        </p>
        <div className="flex flex-wrap gap-1">
          {group.quizzes.slice(0, 5).map((code) => (
            <Badge key={code} variant="outline" className="text-[10px]">
              {code}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
