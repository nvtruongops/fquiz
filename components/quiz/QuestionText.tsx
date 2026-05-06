'use client'

import React from 'react'

interface QuestionTextProps {
  text: string
  questionId?: string
}

export default function QuestionText({
  text,
}: QuestionTextProps) {
  return (
    <div className="relative select-text text-base leading-relaxed text-[#101010] whitespace-pre-wrap">
      {text}
    </div>
  )
}
