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
          <span>1. Thông tin Môn học &amp; Mã đề</span>
          {!isCategorySelected && (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40 bg-amber-500/10">
              Chờ chọn môn học
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        {/* Row 1: Category & Quiz Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
              Chọn Môn học <span className="text-destructive">*</span>
            </label>
            <Select value={categoryId} onValueChange={onSelectCategory}>
              <SelectTrigger id="category-select-trigger" className="h-10 bg-background">
                <SelectValue placeholder="— Bấm để chọn môn học —" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Môn học chứa bộ đề và ngân hàng câu hỏi</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                Mã đề thi (Quiz Code) <span className="text-destructive">*</span>
              </span>
              {isCheckingCode && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </label>
            <div className="relative">
              <Input
                placeholder="Nhập mã đề thi..."
                value={courseCode}
                onChange={(e) => onChangeCourseCode(e.target.value.toUpperCase())}
                className={`font-mono uppercase h-10 ${
                  codeDuplicateInfo?.exists
                    ? 'border-destructive focus-visible:ring-destructive pr-8'
                    : courseCode.trim()
                    ? 'border-emerald-500/50 pr-8'
                    : ''
                }`}
              />
              {courseCode.trim() && !isCheckingCode && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {codeDuplicateInfo?.exists ? (
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
              )}
            </div>
            {codeDuplicateInfo?.exists ? (
              <p className="text-[11px] font-semibold text-destructive">
                ⚠️ Mã đề này đã tồn tại ({codeDuplicateInfo.quiz?.course_code} - {codeDuplicateInfo.quiz?.questionCount} câu)
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Mã nhận diện đề thi trong hệ thống</p>
            )}
          </div>
        </div>

        {/* Row 2: Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider">
            Mô tả / Ghi chú đề thi
          </label>
          <Input
            placeholder="Nhập mô tả hoặc ghi chú đề thi..."
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            className="h-10"
          />
        </div>

        {/* Row 3: Target Count Helper */}
        <div className="p-3.5 bg-muted/30 border border-border/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>
              Tạo nhanh khung đề: <strong>{currentQuestionsCount}</strong> câu hiện có
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
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
              Áp dụng
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
