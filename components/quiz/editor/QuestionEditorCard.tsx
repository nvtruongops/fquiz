'use client'

import React from 'react'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Textarea } from '@/components/shared/ui/textarea'
import { Trash2, Plus, ImageIcon, Hash, ChevronUp, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react'
import { ImageUpload } from '@/components/quiz/shared/ImageUpload'
import { cn } from '@/lib/core/utils/cn'
import { QuestionForm } from '@/lib/modules/quiz/types/quiz'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

interface QuestionEditorCardProps {
  question: QuestionForm
  index: number
  updateQuestion: (qi: number, field: 'text' | 'explanation' | 'image_url', value: string) => void
  removeQuestion: (qi: number) => void
  updateOption: (qi: number, oi: number, value: string) => void
  addOption: (qi: number) => void
  removeOption: (qi: number, oi: number) => void
  toggleCorrect: (qi: number, oi: number) => void
  removeQuestionImage: (qi: number) => void
  error?: { code: string; message: string }
  isQuestionBankMatch?: boolean
}

export function QuestionEditorCard({
  question,
  index,
  updateQuestion,
  removeQuestion,
  updateOption,
  addOption,
  removeOption,
  toggleCorrect,
  removeQuestionImage,
  error,
  isQuestionBankMatch
}: QuestionEditorCardProps) {
  return (
    <Card id={`q-card-${index}`} className={cn(
      "bg-card border-border shadow-xs group transition-all duration-300",
      error ? "border-destructive ring-1 ring-destructive/20" : "hover:shadow-md"
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md">
              {index + 1}
            </div>
            {isQuestionBankMatch && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Đã có trong ngân hàng</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-destructive/10 text-destructive rounded-full border border-destructive/20">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{error.message}</span>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeQuestion(index)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Question Text & Image */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <label htmlFor={`question-text-${index}`} className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nội dung câu hỏi</label>
              <Textarea
                id={`question-text-${index}`}
                placeholder="Nhập câu hỏi tại đây..."
                value={question.text}
                onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                className="min-h-[120px] rounded-xl border-border focus:ring-primary text-base bg-background text-foreground"
              />
            </div>
            <div className="w-full md:w-[240px] shrink-0">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Hình ảnh minh họa</span>
              <ImageUpload
                value={question.image_url}
                onChange={(url) => updateQuestion(index, 'image_url', url)}
                onRemove={() => removeQuestionImage(index)}
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Các lựa chọn trả lời</span>
              <span className="text-[10px] font-bold text-muted-foreground">Chọn tích xanh cho đáp án đúng (có thể chọn nhiều)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {question.options.map((option, oi) => (
                <div key={oi} className="relative group/opt">
                  <div className={cn(
                    "flex items-center gap-2 p-1.5 rounded-xl border-2 transition-all",
                    question.correct_answers.includes(oi) 
                      ? "border-primary bg-primary/10" 
                      : "border-border bg-card"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                      question.correct_answers.includes(oi)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground border border-border"
                    )}>
                      {OPTION_LABELS[oi]}
                    </div>
                    <Textarea
                      value={option}
                      onChange={(e) => updateOption(index, oi, e.target.value)}
                      placeholder={`Lựa chọn ${OPTION_LABELS[oi]}...`}
                      className="border-none bg-transparent focus-visible:ring-0 text-sm py-2 min-h-[40px] resize-none overflow-hidden text-foreground"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                    />
                    <div className="flex items-center gap-1 pr-1">
                      <button
                        type="button"
                        onClick={() => toggleCorrect(index, oi)}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                          question.correct_answers.includes(oi)
                            ? "text-primary bg-primary/15"
                            : "text-muted-foreground hover:text-primary hover:bg-muted"
                        )}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeOption(index, oi)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover/opt:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {question.options.length < 6 && (
                <button
                  type="button"
                  onClick={() => addOption(index)}
                  className="h-14 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-bold">Thêm lựa chọn</span>
                </button>
              )}
            </div>
          </div>

          {/* Explanation */}
          <div className="pt-4 border-t border-border">
            <label htmlFor={`question-explanation-${index}`} className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Giải thích đáp án</label>
            <Textarea
              id={`question-explanation-${index}`}
              placeholder="Tại sao đáp án này lại đúng? Giải thích giúp người học hiểu rõ hơn..."
              value={question.explanation}
              onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
              className="rounded-xl border-border min-h-[80px] focus:ring-primary bg-card text-foreground"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
