'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter()
  const pathname = usePathname()
  
  const isRegister = pathname === '/register'
  const isLogin = pathname === '/login'

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-3 sm:px-4 py-4 sm:py-8">
      {/* Floating Back to Home Button */}
      <div className="absolute top-3 left-3 sm:top-6 sm:left-6 z-50 animate-in fade-in-0 duration-300">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-xs text-card-foreground hover:text-primary transition-all hover:-translate-y-0.5 active:translate-y-0 font-bold text-[11px] sm:text-xs tracking-wider cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Background Aurora Mesh (Optimized lightweight blur) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-gradient-to-br from-primary/15 to-transparent blur-xl rounded-full opacity-30" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-gradient-to-tl from-secondary-accent/20 to-transparent blur-xl rounded-full opacity-30" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full mt-8 sm:mt-0">
        {/* Form Container */}
        <div 
          className={cn(
            "w-full relative transition-all duration-300 animate-in fade-in-0 zoom-in-98",
            isRegister ? "max-w-[480px]" : isLogin ? "max-w-[440px] lg:max-w-4xl" : "max-w-[440px]"
          )}
        >
          {children}
        </div>
      </div>

      {/* Footer Decoration */}
      <div className="relative z-10 mt-4 sm:mt-10 flex items-center gap-2 text-muted-foreground text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span>Smart Learning Platform</span>
      </div>
    </div>
  )
}
