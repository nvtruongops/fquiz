'use client'

import React from 'react'

interface QuizDetailHeaderProps {
  quiz: {
    title: string
    category_id: { name: string }
    course_code: string
    description?: string
    is_temp?: boolean
  } | null
  resolvedQuizId: string
}

export function QuizDetailHeader({ quiz, resolvedQuizId }: QuizDetailHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-6 shadow-xs">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/5 blur-2xl" />
      
      <div className="relative space-y-3 sm:space-y-6">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary px-3 py-1 sm:px-4 sm:py-1.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary-foreground shadow-xs">
            {quiz?.category_id?.name || 'Chung'}
          </span>
          <div className="h-3 w-px bg-border" />
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            ID: {resolvedQuizId.slice(-8).toUpperCase()}
          </span>
        </div>

        <h1 className={`font-extrabold tracking-tight text-foreground break-words ${quiz?.is_temp ? 'text-lg sm:text-2xl lg:text-3xl' : 'text-xl sm:text-3xl lg:text-4xl leading-snug sm:leading-tight'}`}>
          {quiz?.is_temp ? (
            quiz.title.startsWith('Quiz Trộn · ') ? (
              <>
                <span className="block text-sm sm:text-lg lg:text-xl text-muted-foreground font-medium mb-1">Quiz Trộn &middot;</span>
                <span className="block leading-snug">{quiz.title.substring('Quiz Trộn · '.length).split(' + ').join(' +\u00A0')}</span>
              </>
            ) : (
              quiz.title.split(' + ').join(' +\u00A0')
            )
          ) : (
            quiz?.course_code?.replaceAll('_', '_\u200B')
          )}
        </h1>

        {quiz?.description && (
          <div className="max-w-2xl border-l-2 border-primary py-0.5 pl-4 sm:pl-8">
            <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary mb-1 opacity-60">Mô tả bộ đề</p>
            <p className="text-xs sm:text-[13px] font-medium leading-relaxed text-muted-foreground whitespace-pre-wrap">{quiz.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}
