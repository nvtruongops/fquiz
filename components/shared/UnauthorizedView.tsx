'use client'

import React from 'react'
import { Lock, UserPlus, ArrowRight, ShieldAlert } from 'lucide-react'
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
  const targetHref = `${safeRedirectUrl}?redirect=${safeRedirectPath}`

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-10 rounded-[32px] bg-white border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-center relative overflow-hidden group transition-all hover:shadow-[0_30px_60px_rgba(0,0,0,0.06)]",
      className
    )}>
      {/* Decorative Background Element */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-success/5 to-transparent blur-2xl pointer-events-none transform-gpu" />

      <div className="relative z-10">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/5 text-primary shadow-inner">
          <div className="relative">
            <Lock className="h-8 w-8" />
            <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white border-2 border-white">
              <ShieldAlert className="h-2 w-2" />
            </div>
          </div>
        </div>

        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-3">
          {title}
        </h3>
        
        <p className="max-w-[280px] mx-auto text-sm font-medium text-gray-500 leading-relaxed mb-8">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          <Link href={targetHref} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-primary h-12 px-8 text-xs font-black uppercase tracking-[0.2em] text-white rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 hover:translate-y-[-2px] active:translate-y-0 transition-all">
              Đăng nhập ngay
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          
          <Link href="/register" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full sm:w-auto h-12 px-8 text-xs font-black uppercase tracking-[0.2em] text-primary rounded-2xl hover:bg-primary/5 transition-all">
              <UserPlus className="mr-2 h-4 w-4" />
              Tạo tài khoản
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
