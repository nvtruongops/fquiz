'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { BookOpen, Sparkles, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/core/utils/cn'

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter()
  const pathname = usePathname()
  
  const isRegister = pathname === '/register'

  return (
    <div className="min-h-screen bg-page-bg relative overflow-hidden flex flex-col items-center justify-center px-4 py-8">
      {/* Floating Back to Home Button */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute top-6 left-6 z-50"
      >
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-slate-500 hover:text-slate-900 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:translate-y-0 font-bold text-xs tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại trang chủ
        </button>
      </motion.div>

      {/* Background Aurora Mesh */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[70%] bg-gradient-to-br from-primary/25 to-transparent blur-3xl rounded-full transform-gpu opacity-40" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] bg-gradient-to-tl from-secondary-accent/30 to-transparent blur-3xl rounded-full transform-gpu opacity-40" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full">

        {/* Form Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
          className={cn("w-full relative transition-all duration-300", isRegister ? "max-w-[700px]" : "max-w-[440px]")}
        >
          {children}
        </motion.div>
      </div>

      {/* Footer Decoration */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="relative z-10 mt-12 flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]"
      >
        <Sparkles className="w-4 h-4" />
        <span>Học tập thông minh</span>
      </motion.div>
    </div>
  )
}
