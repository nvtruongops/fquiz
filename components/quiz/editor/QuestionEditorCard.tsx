'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Plus, ImageIcon, Hash, ChevronUp, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react'
import { ImageUpload } from '../ImageUpload'
import { cn } from '@/lib/utils'
import { QuestionForm } from '@/types/quiz'

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
      "bg-white border-[#A4C3A2] shadow-md group transition-all duration-300",
      error ? "border-red-500 ring-1 ring-red-100" : "hover:shadow-lg"
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5D7B6F] flex items-center justify-center text-white font-bold shadow-md">
              {index + 1}
            </div>
            {isQuestionBankMatch && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Đã có trong ngân hàng</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100">
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
            className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Question Text & Image */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-[#5D7B6F]/60">Nội dung câu hỏi</label>
              <Textarea
                placeholder="Nhập câu hỏi tại đây..."
                value={question.text}
                onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                className="min-h-[120px] rounded-xl border-[#A4C3A2] focus:ring-[#5D7B6F] text-base"
              />
            </div>
            <div className="w-full md:w-[240px] shrink-0">
              <label className="text-xs font-black uppercase tracking-widest text-[#5D7B6F]/60 mb-2 block">Hình ảnh minh họa</label>
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
              <label className="text-xs font-black uppercase tracking-widest text-[#5D7B6F]/60">Các lựa chọn trả lời</label>
              <span className="text-[10px] font-bold text-gray-400">Chọn tích xanh cho đáp án đúng (có thể chọn nhiều)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {question.options.map((option, oi) => (
                <div key={oi} className="relative group/opt">
                  <div className={cn(
                    "flex items-center gap-2 p-1.5 rounded-xl border-2 transition-all",
                    question.correct_answers.includes(oi) 
                      ? "border-[#5D7B6F] bg-[#5D7B6F]/5" 
                      : "border-gray-100 bg-gray-50"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                      question.correct_answers.includes(oi)
                        ? "bg-[#5D7B6F] text-white"
                        : "bg-white text-gray-400 border border-gray-200"
                    )}>
                      {OPTION_LABELS[oi]}
                    </div>
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, oi, e.target.value)}
                      placeholder={`Lựa chọn ${OPTION_LABELS[oi]}...`}
                      className="border-none bg-transparent focus-visible:ring-0 text-sm h-9"
                    />
                    <div className="flex items-center gap-1 pr-1">
                      <button
                        type="button"
                        onClick={() => toggleCorrect(index, oi)}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                          question.correct_answers.includes(oi)
                            ? "text-[#5D7B6F] bg-[#5D7B6F]/10"
                            : "text-gray-300 hover:text-[#5D7B6F] hover:bg-white"
                        )}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeOption(index, oi)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover/opt:opacity-100"
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
                  className="h-14 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#A4C3A2] hover:text-[#5D7B6F] hover:bg-[#A4C3A2]/5 flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-bold">Thêm lựa chọn</span>
                </button>
              )}
            </div>
          </div>

          {/* Explanation */}
          <div className="pt-4 border-t border-gray-100">
            <label className="text-xs font-black uppercase tracking-widest text-[#5D7B6F]/60 mb-2 block">Giải thích đáp án</label>
            <Textarea
              placeholder="Tại sao đáp án này lại đúng? Giải thích giúp người học hiểu rõ hơn..."
              value={question.explanation}
              onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
              className="rounded-xl border-[#A4C3A2] min-h-[80px] focus:ring-[#5D7B6F] bg-gray-50/50"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
