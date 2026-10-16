import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronUp, ChevronDown, Trash2, Check } from 'lucide-react'
import type { QuestionItem } from '@/hooks/quiz/types'

interface QuizEditorQuestionCardProps {
  question: QuestionItem
  index: number
  totalQuestions: number
  onMoveQuestion: (index: number, direction: 'up' | 'down') => void
  onRemoveQuestion: (index: number) => void
  onUpdateQuestionText: (index: number, text: string) => void
  onUpdateOption: (qIndex: number, optIndex: number, val: string) => void
  onAddOption: (qIndex: number) => void
  onRemoveOption: (qIndex: number, optIndex: number) => void
  onToggleCorrect: (qIndex: number, optIndex: number) => void
  onUpdateExplanation: (index: number, explanation: string) => void
}

export function QuizEditorQuestionCard({
  question: q,
  index: qIndex,
  totalQuestions,
  onMoveQuestion,
  onRemoveQuestion,
  onUpdateQuestionText,
  onUpdateOption,
  onAddOption,
  onRemoveOption,
  onToggleCorrect,
  onUpdateExplanation,
}: QuizEditorQuestionCardProps) {
  const isValid = q.text.trim() && q.options.filter((o) => o.trim()).length >= 2

  return (
    <Card
      id={`question-card-${qIndex}`}
      className="border-border bg-card relative transition-all shadow-xs"
    >
      <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-muted text-foreground">
            Question {qIndex + 1}
          </span>
          {isValid ? (
            <Badge variant="outline" className="text-[10px] text-success-fg border-success-border">
              Valid
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
              Incomplete
            </Badge>
          )}
          {q.question_id && (
            <span className="text-[10px] font-mono text-muted-foreground">
              ID: {q.question_id}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={qIndex === 0}
            onClick={() => onMoveQuestion(qIndex, 'up')}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={qIndex === totalQuestions - 1}
            onClick={() => onMoveQuestion(qIndex, 'down')}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemoveQuestion(qIndex)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
            title="Delete question"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3.5">
        <div>
          <textarea
            rows={2}
            placeholder={`Enter question ${qIndex + 1}...`}
            value={q.text}
            onChange={(e) => onUpdateQuestionText(qIndex, e.target.value)}
            className="w-full resize-none font-medium border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Options */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Options (Click circle to select correct answer):
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAddOption(qIndex)}
              className="h-6 text-[11px] text-primary hover:text-primary/80 cursor-pointer"
            >
              + Add option
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {q.options.map((opt, optIndex) => {
              const isCorrect = q.correct_answer.includes(optIndex)
              const optLabel = String.fromCharCode(65 + optIndex)

              return (
                <div
                  key={optIndex}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                    isCorrect ? 'border-primary bg-primary/10' : 'border-border bg-background'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleCorrect(qIndex, optIndex)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                      isCorrect
                        ? 'bg-primary border-primary text-primary-foreground font-bold'
                        : 'border-muted-foreground/50 hover:border-foreground text-xs font-semibold text-muted-foreground'
                    }`}
                    title={`Set ${optLabel} as correct answer`}
                  >
                    {isCorrect ? <Check className="w-3.5 h-3.5" /> : optLabel}
                  </button>

                  <Input
                    placeholder={`Option ${optLabel}...`}
                    value={opt}
                    onChange={(e) => onUpdateOption(qIndex, optIndex, e.target.value)}
                    className="h-8 text-xs border-transparent focus:border-input bg-transparent"
                  />

                  {q.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => onRemoveOption(qIndex, optIndex)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
                      title="Delete this option"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Explanation */}
        <div>
          <Input
            placeholder="Detailed explanation (optional)..."
            value={q.explanation ?? ''}
            onChange={(e) => onUpdateExplanation(qIndex, e.target.value)}
            className="h-8 text-xs text-muted-foreground"
          />
        </div>
      </CardContent>
    </Card>
  )
}
