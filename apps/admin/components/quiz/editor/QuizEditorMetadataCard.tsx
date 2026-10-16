import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react'
import type { Category } from '@/hooks/quiz/types'

interface QuizEditorMetadataCardProps {
  categories: Category[]
  categoryId: string
  onSelectCategory: (id: string) => void
  courseCode: string
  onChangeCourseCode: (code: string) => void
  isCheckingCode: boolean
  codeDuplicateInfo: { exists: boolean; quiz?: { title: string; course_code: string; questionCount: number } } | null
  description: string
  onChangeDescription: (desc: string) => void
  targetCount: number | ''
  onChangeTargetCount: (val: number | '') => void
  onApplyTargetCount: () => void
  currentQuestionsCount: number
}

export function QuizEditorMetadataCard({
  categories,
  categoryId,
  onSelectCategory,
  courseCode,
  onChangeCourseCode,
  isCheckingCode,
  codeDuplicateInfo,
  description,
  onChangeDescription,
  targetCount,
  onChangeTargetCount,
  onApplyTargetCount,
  currentQuestionsCount,
}: QuizEditorMetadataCardProps) {
  const isCategorySelected = Boolean(categoryId)

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-3 border-b border-border/60">
        <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
          <span>1. Category &amp; Quiz Code</span>
          {!isCategorySelected && (
            <Badge variant="outline" className="text-[10px] text-warning-fg border-warning-border bg-warning-bg">
              Awaiting category selection
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        {/* Row 1: Category & Quiz Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-1.5">
            <label htmlFor="category-select-trigger" className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
              Category <span className="text-destructive">*</span>
            </label>
            <Select value={categoryId} onValueChange={onSelectCategory}>
              <SelectTrigger id="category-select-trigger" aria-label="Select quiz category" className="h-10 bg-background">
                <SelectValue placeholder="— Click to select a category —" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Category containing quizzes and question bank</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="quiz-course-code" className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                Quiz Code <span className="text-destructive">*</span>
              </span>
              {isCheckingCode && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" aria-hidden="true" />}
            </label>
            <div className="relative">
              <Input
                id="quiz-course-code"
                placeholder="Enter quiz code..."
                value={courseCode}
                onChange={(e) => onChangeCourseCode(e.target.value.toUpperCase())}
                className={`font-mono uppercase h-10 ${
                  codeDuplicateInfo?.exists
                    ? 'border-destructive focus-visible:ring-destructive pr-8'
                    : courseCode.trim()
                    ? 'border-success-border pr-8'
                    : ''
                }`}
              />
              {courseCode.trim() && !isCheckingCode && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {codeDuplicateInfo?.exists ? (
                    <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-success-fg" aria-hidden="true" />
                  )}
                </div>
              )}
            </div>
            {codeDuplicateInfo?.exists ? (
              <p className="text-[11px] font-semibold text-destructive">
                ⚠️ This quiz code already exists ({codeDuplicateInfo.quiz?.course_code} - {codeDuplicateInfo.quiz?.questionCount} {codeDuplicateInfo.quiz?.questionCount === 1 ? 'question' : 'questions'})
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Unique identifier for this quiz in the system</p>
            )}
          </div>
        </div>

        {/* Row 2: Description */}
        <div className="space-y-1.5">
          <label htmlFor="quiz-description" className="text-xs font-bold text-foreground uppercase tracking-wider">
            Description / Quiz Notes
          </label>
          <Input
            id="quiz-description"
            placeholder="Enter description or quiz notes..."
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            className="h-10"
          />
        </div>

        {/* Row 3: Target Count Helper */}
        <div className="p-3.5 bg-muted/30 border border-border/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span>
              Quick question scaffolding: <strong>{currentQuestionsCount}</strong> current question(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="quiz-target-count"
              aria-label="Target question count"
              type="number"
              placeholder="60"
              value={targetCount}
              onChange={(e) => onChangeTargetCount(e.target.value ? Number(e.target.value) : '')}
              className="w-24 h-8 text-xs font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={1}
              max={200}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onApplyTargetCount}
              disabled={typeof targetCount !== 'number' || targetCount <= currentQuestionsCount}
              className="h-8 text-xs cursor-pointer"
            >
              Apply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
