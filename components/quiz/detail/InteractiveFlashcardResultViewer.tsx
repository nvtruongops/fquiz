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
      <div className="p-8 text-center bg-card rounded-2xl border border-border text-muted-foreground font-medium">
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
      <div className="md:col-span-4 lg:col-span-3 bg-card rounded-2xl p-3.5 shadow-xs border border-border flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
          <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-primary" />
            Bộ thẻ ({totalCards})
          </span>
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
            Đã nhớ {knownCount}/{totalCards}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-xl text-[10px] font-bold select-none my-3 shrink-0">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'py-1 rounded-lg transition-all text-center',
              filter === 'all'
                ? 'bg-card text-foreground shadow-xs font-black'
                : 'text-muted-foreground hover:text-foreground'
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
                : 'text-emerald-500 hover:bg-emerald-500/10'
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
                ? 'bg-destructive text-destructive-foreground shadow-xs font-black'
                : 'text-destructive hover:bg-destructive/10'
            )}
          >
            Cần ôn lại ({unknownCount})
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
                    ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                    : isKnown
                    ? 'border-border bg-muted/50 hover:bg-muted text-card-foreground'
                    : 'border-incorrect-border bg-incorrect-bg hover:bg-incorrect-bg/80 text-card-foreground'
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={cn(
                    'w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0',
                    isKnown ? 'bg-success-bg text-success-fg' : 'bg-incorrect-bg text-destructive'
                  )}>
                    {idx + 1}
                  </span>
                  <span className="truncate font-semibold text-card-foreground">{q.text}</span>
                </div>

                {isKnown ? (
                  <Badge className="bg-success-bg text-success-fg hover:bg-success-bg border-none text-[10px] px-1.5 py-0 shrink-0 font-bold">
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
      <div className="md:col-span-8 lg:col-span-9 bg-card rounded-2xl p-4 shadow-xs border border-border flex flex-col h-full min-h-0 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
              Thẻ {selectedIndex + 1} / {totalCards}
            </span>
            {currentQuestion.is_correct ? (
              <Badge className="bg-success-bg/20 text-success-fg border-none text-xs font-bold px-2.5 py-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Bạn đánh dấu: ĐÃ NHỚ
              </Badge>
            ) : (
              <Badge className="bg-destructive/10 text-destructive border-none text-xs font-bold px-2.5 py-0.5">
                <RotateCcw className="w-3.5 h-3.5 mr-1 inline" /> Bạn đánh dấu: CẦN ÔN LẠI
              </Badge>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAnswer(!showAnswer)}
            className="text-xs font-bold text-primary hover:bg-primary/10 rounded-xl"
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
          <div className="bg-muted/50 p-4 rounded-2xl border border-border flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
                  Mặt trước thẻ (Đề bài & Lựa chọn)
                </span>
                <span className="text-[10px] font-mono text-muted-foreground bg-card px-2 py-0.5 rounded border border-border">Front</span>
              </div>

              {/* Question Text */}
              <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug mb-3">
                {currentQuestion.text}
              </h3>

              {/* Question Image */}
              {currentQuestion.image_url && (
                <div className="mb-3 flex justify-center">
                  <img
                    src={currentQuestion.image_url}
                    alt="Question"
                    className="max-h-40 rounded-xl object-contain border border-border bg-card p-1"
                  />
                </div>
              )}

              {/* Options A, B, C, D */}
              {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                    Các phương án lựa chọn:
                  </span>
                  <div className="space-y-1.5">
                    {currentQuestion.options.map((optText: string, optIdx: number) => {
                      const letter = String.fromCharCode(65 + optIdx)

                      return (
                        <div
                          key={optIdx}
                          className="p-2.5 rounded-xl border border-border bg-card text-foreground text-xs font-medium flex items-center gap-2.5 shadow-xs"
                        >
                          <span className="w-6 h-6 rounded-lg bg-muted text-muted-foreground border border-border flex items-center justify-center text-xs font-black shrink-0">
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
          <div className="bg-success-bg/10 p-4 rounded-2xl border border-success-fg/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-success-fg/20 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-success-fg flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success-fg" />
                  Mặt sau thẻ (Đáp án & Gợi ý)
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200 font-bold">Back</span>
              </div>

              {showAnswer ? (
                <div className="space-y-4 animate-in fade-in">
                  {/* Correct Answer Highlight */}
                  <div className="bg-card p-4 rounded-xl border border-success-border shadow-xs space-y-1 text-card-foreground">
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
                      Đáp án chính xác:
                    </span>
                    <div className="flex items-center gap-2 text-sm font-black text-success-fg">
                      {correctAnswerLetter && (
                        <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-md text-xs">
                          {correctAnswerLetter}
                        </span>
                      )}
                      <span>{correctAnswerText}</span>
                    </div>
                  </div>

                  {/* Explanation / Notes */}
                  {currentQuestion.explanation ? (
                    <div className="bg-card p-4 rounded-xl border border-border space-y-1.5 text-xs text-card-foreground leading-relaxed">
                      <span className="font-bold text-primary uppercase tracking-wider text-[10px] flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-primary" /> Giải thích / Dịch nghĩa / Mẹo nhớ:
                      </span>
                      <p className="whitespace-pre-line font-medium text-card-foreground pt-1">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground italic">
                      Không có thêm phần giải thích cho câu hỏi này.
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-muted/60 rounded-xl border border-border text-muted-foreground space-y-2">
                  <EyeOff className="w-8 h-8 text-primary/60" />
                  <p className="text-xs font-bold text-card-foreground">Đáp án mặt sau đang ẩn</p>
                  <p className="text-[11px] text-muted-foreground">Ấn nút "Hiện đáp án mặt sau" ở góc trên để mở đáp án.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
