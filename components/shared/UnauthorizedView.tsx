'use client'

import React from 'react'
import { Lock, UserPlus, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/core/utils/cn'

interface UnauthorizedViewProps {
  title?: string
  description?: string
  redirectUrl?: string
  className?: string
}

export function UnauthorizedView({
  title = "Yêu cầu đăng nhập",
  description = "Vui lòng đăng nhập để truy cập tính năng này và lưu lại tiến độ học tập của bạn.",
  redirectUrl = "/login",
  className
}: UnauthorizedViewProps) {
  let safeRedirectPath = ''
  if (typeof window !== 'undefined') {
    const rawPath = window.location.pathname
    if (/^[a-zA-Z0-9_\-\/]+$/.test(rawPath)) {
      safeRedirectPath = encodeURIComponent(rawPath)
    }
  }

  const isSafeRedirectUrl = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')
  const safeRedirectUrl = isSafeRedirectUrl ? redirectUrl : '/login'
  const loginHref = `${safeRedirectUrl}?redirect=${safeRedirectPath}`
  const registerHref = safeRedirectPath ? `/register?redirect=${safeRedirectPath}` : '/register'

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-6 sm:p-10 rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-center relative overflow-hidden group transition-all",
      className
    )}>
      {/* Decorative Radial Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#5D7B6F]/10 via-[#A4C3A2]/5 to-transparent blur-2xl pointer-events-none transform-gpu" />

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center">
        {/* Lock / Shield Icon */}
        <div className="mb-5 inline-flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-[#5D7B6F]/10 text-[#5D7B6F] shadow-xs border border-[#5D7B6F]/20">
          <div className="relative">
            <Lock className="h-7 w-7 sm:h-8 sm:w-8" />
            <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white border-2 border-white">
              <ShieldCheck className="h-2.5 w-2.5" />
            </div>
          </div>
        </div>

        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 uppercase tracking-tight mb-2">
          {title}
        </h3>
        
        <p className="max-w-[320px] text-xs sm:text-sm font-medium text-slate-500 leading-relaxed mb-6">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full">
          <Link href={loginHref} className="w-full sm:flex-1">
            <Button className="w-full h-11 sm:h-12 bg-[#5D7B6F] hover:bg-[#4a6358] text-xs font-bold uppercase tracking-wider text-white rounded-xl sm:rounded-2xl shadow-md shadow-[#5D7B6F]/20 active:scale-[0.98] transition-all cursor-pointer">
              Đăng nhập ngay
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          
          <Link href={registerHref} className="w-full sm:flex-1">
            <Button variant="outline" className="w-full h-11 sm:h-12 text-xs font-bold uppercase tracking-wider text-[#5D7B6F] border-[#5D7B6F]/30 hover:bg-[#5D7B6F]/10 rounded-xl sm:rounded-2xl active:scale-[0.98] transition-all cursor-pointer">
              <UserPlus className="mr-2 h-4 w-4" />
              Tạo tài khoản
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
