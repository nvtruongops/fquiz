'use client'

import React, { useState, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'

export function StepItem({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center group">
      <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#5D7B6F]/30 to-[#5D7B6F]/5 group-hover:from-[#5D7B6F]/60 group-hover:to-[#5D7B6F]/20 transition-all duration-500 mb-6 drop-shadow-sm select-none">
        {number}
      </div>
      <div>
        <h4 className="text-xl md:text-2xl font-black text-slate-800 mb-3 group-hover:text-[#5D7B6F] transition-colors">{title}</h4>
        <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <div 
      onClick={() => setIsOpen(!isOpen)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setIsOpen(!isOpen)
        }
      }}
      className={cn(
        "group bg-white/60 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border-2 transition-all duration-300 cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.02)]",
        isOpen ? "border-[#5D7B6F]/30 bg-white/90 shadow-md" : "border-white/80 hover:border-[#5D7B6F]/20 hover:bg-white/80"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="font-bold text-[17px] sm:text-lg text-slate-800">{question}</p>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
          isOpen ? "bg-[#5D7B6F]/10" : "bg-slate-100 group-hover:bg-[#5D7B6F]/10"
        )}>
          <ChevronDown className={cn(
            "w-5 h-5 transition-transform duration-500",
            isOpen ? "text-[#5D7B6F] rotate-180" : "text-slate-400 group-hover:text-[#5D7B6F]"
          )} />
        </div>
      </div>
      
      <div 
        className="overflow-hidden transition-all duration-500 ease-in-out"
        style={{ maxHeight: isOpen ? (contentRef.current?.scrollHeight || 200) + 'px' : '0px', opacity: isOpen ? 1 : 0 }}
      >
        <div ref={contentRef} className="pt-5 mt-2 border-t border-slate-100">
          <p className="text-slate-500 font-medium leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  )
}
