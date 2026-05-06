'use client'

import React from 'react'
import { ChevronDown } from 'lucide-react'

export function StepItem({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center group">
      <div className="text-5xl font-black text-[#5D7B6F]/20 group-hover:text-[#5D7B6F]/40 transition-colors mb-4">{number}</div>
      <div>
        <h4 className="text-xl font-black text-gray-900 mb-2">{title}</h4>
        <p className="text-gray-500 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="group bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-[#A4C3A2]/20 hover:border-[#5D7B6F]/30 transition-all cursor-pointer">
      <div className="flex items-center justify-between gap-4">
        <p className="font-black text-gray-900">{question}</p>
        <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-[#5D7B6F] transition-colors" />
      </div>
      <div className="max-h-0 overflow-hidden group-hover:max-h-40 transition-all duration-500 ease-in-out">
        <p className="pt-4 text-gray-500 font-medium leading-relaxed">{answer}</p>
      </div>
    </div>
  )
}
