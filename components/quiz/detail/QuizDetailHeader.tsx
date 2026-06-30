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
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#5D7B6F]/5 blur-2xl" />
      
      <div className="relative space-y-6">
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-[#5D7B6F] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-[#5D7B6F]/20">
            {quiz?.category_id?.name || 'Chung'}
          </span>
          <div className="h-4 w-px bg-gray-100" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            ID: {resolvedQuizId.slice(-8).toUpperCase()}
          </span>
        </div>

        <h1 className={`font-normal tracking-tight text-gray-900 break-words ${quiz?.is_temp ? 'text-2xl lg:text-3xl' : 'text-3xl lg:text-4xl leading-tight'}`}>
          {quiz?.is_temp ? (
            quiz.title.startsWith('Quiz Trộn · ') ? (
              <>
                <span className="block text-lg lg:text-xl text-gray-500 font-medium mb-1.5">Quiz Trộn &middot;</span>
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
          <div className="max-w-2xl border-l-3 border-[#A4C3A2] py-1 pl-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5D7B6F] mb-2 opacity-60">Mô tả bộ đề</p>
            <p className="text-[13px] font-medium leading-relaxed text-gray-500/90 whitespace-pre-wrap">{quiz.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}
