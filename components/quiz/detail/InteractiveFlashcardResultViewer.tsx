'use client'

import React, { useState } from 'react'
import { CheckCircle2, RotateCcw, Layers, Eye, EyeOff, Check, HelpCircle, BookOpen } from 'lucide-react'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { cn } from '@/lib/core/utils/cn'

export interface ResultQuestion {
  _id: string
  text: string
  options: string[]
  correct_answer: number | number[]
  explanation?: string
  image_url?: string
  submitted_answer: number | number[] | null
  is_correct: boolean
}

interface InteractiveFlashcardResultViewerProps {
  questions: ResultQuestion[]
}

type FilterType = 'all' | 'known' | 'unknown'

export function InteractiveFlashcardResultViewer({ questions }: Readonly<InteractiveFlashcardResultViewerProps>) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [filter, setFilter] = useState<FilterType>('all')
  const [showAnswer, setShowAnswer] = useState<boolean>(true)

  if (!questions || questions.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">
        Không có thông tin chi tiết thẻ ghi nhớ.
      </div>
    )
  }

  const totalCards = questions.length
  const knownCount = questions.filter((q) => q.is_correct).length
  const unknownCount = totalCards - knownCount

  const currentQuestion = questions[selectedIndex] || questions[0]
  const currentCorrectIdx = Array.isArray(currentQuestion.correct_answer)
    ? currentQuestion.correct_answer[0]
    : currentQuestion.correct_answer
  const correctAnswerLetter = typeof currentCorrectIdx === 'number' && currentCorrectIdx >= 0
    ? String.fromCharCode(65 + currentCorrectIdx)
    : ''
  const correctAnswerText = currentQuestion.options?.[currentCorrectIdx] || currentQuestion.options?.[0] || ''

  return (
    <div className="w-full max-w-full h-full flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch overflow-hidden">
      {/* 1. Left Sidebar Panel: Flashcard List & Filter Matrix */}
      <div className="md:col-span-4 lg:col-span-3 bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200/80 flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-[#5D7B6F]" />
            Bộ thẻ ({totalCards})
          </span>
          <span className="text-[11px] font-bold text-[#5D7B6F] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
            Đã nhớ {knownCount}/{totalCards}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-[10px] font-bold select-none my-3 shrink-0">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'py-1 rounded-lg transition-all text-center',
              filter === 'all'
                ? 'bg-white text-slate-800 shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            Tất cả ({totalCards})
          </button>
          <button
            type="button"
            onClick={() => setFilter('known')}
            className={cn(
              'py-1 rounded-lg transition-all text-center',
              filter === 'known'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-emerald-700 hover:bg-emerald-50'
            )}
          >
            Đã nhớ ({knownCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unknown')}
            className={cn(
              'py-1 rounded-lg transition-all text-center',
              filter === 'unknown'
                ? 'bg-rose-500 text-white shadow-xs font-black'
                : 'text-rose-600 hover:bg-rose-50'
            )}
          >
            Ôn lại ({unknownCount})
          </button>
        </div>

        {/* Matrix Grid of Cards */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin space-y-1.5">
          {questions.map((q, idx) => {
            if (filter === 'known' && !q.is_correct) return null
            if (filter === 'unknown' && q.is_correct) return null

            const isSelected = selectedIndex === idx
            const isKnown = q.is_correct

            return (
              <button
                key={q._id || idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={cn(
                  'w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs font-medium',
                  isSelected
                    ? 'border-[#5D7B6F] bg-emerald-50/70 shadow-xs ring-1 ring-[#5D7B6F]'
                    : isKnown
                    ? 'border-slate-100 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    : 'border-rose-100 bg-rose-50/30 hover:bg-rose-50 text-slate-800'
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={cn(
                    'w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0',
                    isKnown ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                  )}>
                    {idx + 1}
                  </span>
                  <span className="truncate font-semibold text-slate-800">{q.text}</span>
                </div>

                {isKnown ? (
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-[10px] px-1.5 py-0 shrink-0 font-bold">
                    <CheckCircle2 className="w-3 h-3 mr-0.5 inline" /> Đã nhớ
                  </Badge>
                ) : (
                  <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none text-[10px] px-1.5 py-0 shrink-0 font-bold">
                    <RotateCcw className="w-3 h-3 mr-0.5 inline" /> Cần ôn
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Main Workspace: Split 2 Cards Side-by-Side (Front Card vs Back Card) */}
      <div className="md:col-span-8 lg:col-span-9 bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 flex flex-col h-full min-h-0 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Thẻ {selectedIndex + 1} / {totalCards}
            </span>
            {currentQuestion.is_correct ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-none text-xs font-bold px-2.5 py-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Bạn đánh dấu: ĐÃ NHỚ
              </Badge>
            ) : (
              <Badge className="bg-rose-100 text-rose-700 border-none text-xs font-bold px-2.5 py-0.5">
                <RotateCcw className="w-3.5 h-3.5 mr-1 inline" /> Bạn đánh dấu: CẦN ÔN LẠI
              </Badge>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAnswer(!showAnswer)}
            className="text-xs font-bold text-[#5D7B6F] hover:bg-emerald-50 rounded-xl"
          >
            {showAnswer ? (
              <><EyeOff className="w-3.5 h-3.5 mr-1" /> Ẩn đáp án mặt sau</>
            ) : (
              <><Eye className="w-3.5 h-3.5 mr-1" /> Hiện đáp án mặt sau</>
            )}
          </Button>
        </div>

        {/* Side-by-Side Cards Grid (Left: Front Card with Question + Options A B C D | Right: Back Card with Answer & Explanation) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 pt-3 overflow-y-auto scrollbar-thin">
          {/* Card 1: MẶT TRƯỚC THẺ (Câu hỏi & Lựa chọn A, B, C, D) */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  Mặt trước thẻ (Đề bài & Lựa chọn)
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">Front</span>
              </div>

              {/* Question Text */}
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug mb-3">
                {currentQuestion.text}
              </h3>

              {/* Question Image */}
              {currentQuestion.image_url && (
                <div className="mb-3 flex justify-center">
                  <img
                    src={currentQuestion.image_url}
                    alt="Question"
                    className="max-h-40 rounded-xl object-contain border border-slate-200 bg-white p-1"
                  />
                </div>
              )}

              {/* Options A, B, C, D */}
              {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Các phương án lựa chọn:
                  </span>
                  <div className="space-y-1.5">
                    {currentQuestion.options.map((optText: string, optIdx: number) => {
                      const letter = String.fromCharCode(65 + optIdx)

                      return (
                        <div
                          key={optIdx}
                          className="p-2.5 rounded-xl border border-slate-200/80 bg-white text-slate-800 text-xs font-medium flex items-center gap-2.5 shadow-xs"
                        >
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center text-xs font-black shrink-0">
                            {letter}
                          </span>
                          <span className="leading-snug flex-1">{optText}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: MẶT SAU THẺ (Đáp án chuẩn & Giải thích) */}
          <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#5D7B6F] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Mặt sau thẻ (Đáp án & Gợi ý)
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200 font-bold">Back</span>
              </div>

              {showAnswer ? (
                <div className="space-y-4 animate-in fade-in">
                  {/* Correct Answer Highlight */}
                  <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#5D7B6F] block">
                      Đáp án chính xác:
                    </span>
                    <div className="flex items-center gap-2 text-sm font-black text-emerald-950">
                      {correctAnswerLetter && (
                        <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-xs">
                          {correctAnswerLetter}
                        </span>
                      )}
                      <span>{correctAnswerText}</span>
                    </div>
                  </div>

                  {/* Explanation / Notes */}
                  {currentQuestion.explanation ? (
                    <div className="bg-white/90 p-4 rounded-xl border border-emerald-100 space-y-1.5 text-xs text-slate-700 leading-relaxed">
                      <span className="font-bold text-[#5D7B6F] uppercase tracking-wider text-[10px] flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Giải thích / Dịch nghĩa / Mẹo nhớ:
                      </span>
                      <p className="whitespace-pre-line font-medium text-slate-800 pt-1">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-white/60 border border-emerald-100/60 text-xs text-slate-400 italic">
                      Không có thêm phần giải thích cho câu hỏi này.
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-white/60 rounded-xl border border-emerald-100 text-slate-400 space-y-2">
                  <EyeOff className="w-8 h-8 text-emerald-400/60" />
                  <p className="text-xs font-bold text-slate-600">Đáp án mặt sau đang ẩn</p>
                  <p className="text-[11px] text-slate-400">Ấn nút "Hiện đáp án mặt sau" ở góc trên để mở đáp án.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
