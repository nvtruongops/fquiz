'use client'

import React from 'react'
import { HelpCircle, Users } from 'lucide-react'

interface QuizStatsProps {
  numQuestions: number
  numAttempts: number
}

export function QuizStats({ numQuestions, numAttempts }: QuizStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="group flex items-center gap-5 rounded-2xl border border-gray-50 bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.01)] transition-all hover:shadow-xl hover:shadow-[#5D7B6F]/5 hover:-translate-y-0.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50/50 text-blue-500 ring-1 ring-blue-100 transition-all group-hover:scale-110 group-hover:bg-blue-50">
          <HelpCircle className="h-6 w-6" />
        </div>
        <div>
          <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-gray-400">Quy mô nội dung</p>
          <p className="text-xl font-normal text-gray-900 tracking-tight">{numQuestions} <span className="text-[10px] font-bold text-gray-300">CÂU HỎI</span></p>
        </div>
      </div>

      <div className="group flex items-center gap-5 rounded-2xl border border-gray-50 bg-white p-5 shadow-[0_4px_20px_rgb(0,0,0,0.01)] transition-all hover:shadow-xl hover:shadow-[#5D7B6F]/5 hover:-translate-y-0.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50/50 text-green-500 ring-1 ring-green-100 transition-all group-hover:scale-110 group-hover:bg-green-50">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-gray-400">Độ phổ biến</p>
          <p className="text-xl font-normal text-gray-900 tracking-tight">{numAttempts ?? 0} <span className="text-[10px] font-bold text-gray-300">LƯỢT THI</span></p>
        </div>
      </div>
    </div>
  )
}
