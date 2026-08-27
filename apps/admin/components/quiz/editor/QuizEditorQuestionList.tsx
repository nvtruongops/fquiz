import React from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Lock } from 'lucide-react'
import { QuizEditorQuestionCard } from './QuizEditorQuestionCard'
import type { QuestionItem } from '@/hooks/quiz/types'

interface QuizEditorQuestionListProps {
  questions: QuestionItem[]
  isCategorySelected: boolean
  onAddQuestion: () => void
  onMoveQuestion: (index: number, direction: 'up' | 'down') => void
  onRemoveQuestion: (index: number) => void
  onUpdateQuestionText: (index: number, text: string) => void
  onUpdateOption: (qIndex: number, optIndex: number, val: string) => void
  onAddOption: (qIndex: number) => void
  onRemoveOption: (qIndex: number, optIndex: number) => void
  onToggleCorrect: (qIndex: number, optIndex: number) => void
  onUpdateExplanation: (index: number, explanation: string) => void
}

export function QuizEditorQuestionList({
  questions,
  isCategorySelected,
  onAddQuestion,
  onMoveQuestion,
  onRemoveQuestion,
  onUpdateQuestionText,
  onUpdateOption,
  onAddOption,
  onRemoveOption,
  onToggleCorrect,
  onUpdateExplanation,
}: QuizEditorQuestionListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">
          2. Danh sách câu hỏi ({questions.length})
        </h2>
        <Button
          type="button"
          size="sm"
          disabled={!isCategorySelected}
          onClick={onAddQuestion}
          className="gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm câu hỏi
        </Button>
      </div>

      {!isCategorySelected ? (
        <div className="p-8 border-2 border-dashed border-border rounded-2xl text-center bg-muted/10 space-y-2">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-bold text-foreground">Bảng soạn thảo đang tạm khóa</p>
          <p className="text-xs text-muted-foreground">
            Vui lòng chọn Môn học ở mục 1 để mở khóa soạn thảo câu hỏi.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, qIndex) => (
            <QuizEditorQuestionCard
              key={qIndex}
              question={q}
              index={qIndex}
              totalQuestions={questions.length}
              onMoveQuestion={onMoveQuestion}
              onRemoveQuestion={onRemoveQuestion}
              onUpdateQuestionText={onUpdateQuestionText}
              onUpdateOption={onUpdateOption}
              onAddOption={onAddOption}
              onRemoveOption={onRemoveOption}
              onToggleCorrect={onToggleCorrect}
              onUpdateExplanation={onUpdateExplanation}
            />
          ))}
        </div>
      )}
    </div>
  )
}
