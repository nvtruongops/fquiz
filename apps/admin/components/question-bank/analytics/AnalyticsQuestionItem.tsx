import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { AnalyticsQuestion } from '@/hooks/question-bank/useQuestionBankAnalytics'

interface AnalyticsQuestionItemProps {
  question: AnalyticsQuestion
  index: number
}

export function AnalyticsQuestionItem({ question, index }: AnalyticsQuestionItemProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-2">
            <span className="text-sm font-bold text-muted-foreground mt-1">
              #{index + 1}
            </span>
            <p className="font-medium text-card-foreground flex-1">{question.text}</p>
          </div>

          <div className="flex items-center gap-3 ml-8 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              Dùng {question.usage_count} lần
            </Badge>
            {question.used_in_quizzes.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Trong:</span>
                {question.used_in_quizzes.slice(0, 3).map((code) => (
                  <Badge key={code} variant="outline" className="text-[10px]">
                    {code}
                  </Badge>
                ))}
                {question.used_in_quizzes.length > 3 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{question.used_in_quizzes.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)} className="gap-1">
          {isOpen ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Ẩn
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Xem
            </>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="mt-3 ml-8 space-y-2 pt-2 border-t border-border">
          {question.options.map((option, idx) => {
            const isCorrect = question.correct_answer.includes(idx)
            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-sm ${
                  isCorrect
                    ? 'bg-success-bg border-success-border font-medium text-success-fg'
                    : 'bg-muted/40 border-border text-card-foreground'
                }`}
              >
                <span className="font-bold mr-2">
                  {String.fromCodePoint(65 + idx)}.
                </span>
                {option}
                {isCorrect && (
                  <span className="ml-2 text-success-fg font-bold">✓</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
