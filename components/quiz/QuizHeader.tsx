'use client'

import React from 'react'

interface QuizHeaderProps {
  categoryName: string
  courseCode: string
  totalQuestions: number
  currentIndex: number
  answeredCount: number
  children?: React.ReactNode
}

export default function QuizHeader({
  categoryName,
  courseCode,
  totalQuestions,
  currentIndex,
  answeredCount,
  children
}: Readonly<QuizHeaderProps>) {
  const safeTotal = totalQuestions > 0 ? totalQuestions : 1
  const progressPercent = Math.min(100, Math.max(0, Math.round((answeredCount / safeTotal) * 100)))

  return (
    <header className="shrink-0 border-b-2 border-[#101010] bg-[#e9e9e9] px-3 py-2 sm:px-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
        <div className="flex min-w-[210px] flex-col gap-1 text-[15px] font-semibold leading-tight text-[#111111]">
          <p>Danh mục: <span className="font-bold">{categoryName || 'Chưa phân loại'}</span></p>
          <p>Mã Quiz: <span className="font-bold uppercase">{courseCode || 'N/A'}</span></p>
        </div>
        <div className="min-w-0 flex-1 border border-[#c8c8c8] bg-[#efefef] px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-[#2f6f31]">
              There are {totalQuestions || 0} questions, and your progress of answering is {progressPercent}% ({answeredCount}/{totalQuestions || 0}) - current question: {Math.min(currentIndex + 1, Math.max(totalQuestions, 1))}
            </p>
            {children && <div className="shrink-0">{children}</div>}
          </div>
          <div className="mt-1 border border-[#c8c8c8] bg-white p-[2px]">
            <progress
              value={progressPercent}
              max={100}
              className="h-3 w-full overflow-hidden [&::-webkit-progress-bar]:bg-white [&::-webkit-progress-value]:bg-[#22b14c] [&::-moz-progress-bar]:bg-[#22b14c]"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
