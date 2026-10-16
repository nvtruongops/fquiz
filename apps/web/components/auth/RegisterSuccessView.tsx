'use client'

import React from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'

export function RegisterSuccessView() {
  return (
    <div className="w-full text-center py-6 sm:py-8">
      <div className="bg-card/80 backdrop-blur-2xl rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-border p-6 sm:p-10">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-inner">
          <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-success-fg" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-card-foreground mb-2 sm:mb-3 tracking-tight">
          Registration successful!
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm font-medium">
          Welcome to FQuiz. Signing you in automatically…
        </p>
        <div className="mt-6 sm:mt-8 flex justify-center">
          <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-primary animate-spin drop-shadow-2xs" />
        </div>
      </div>
    </div>
  )
}
