'use client'

import React from 'react'
import { Lock, UserPlus, ArrowRight, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-10 rounded-[32px] bg-white border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-center relative overflow-hidden group transition-all hover:shadow-[0_30px_60px_rgba(0,0,0,0.06)]",
      className
    )}>
      {/* Decorative Background Elements */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#5D7B6F]/5 rounded-full blur-3xl group-hover:bg-[#5D7B6F]/10 transition-colors" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#A4C3A2]/5 rounded-full blur-3xl group-hover:bg-[#A4C3A2]/10 transition-colors" />

      <div className="relative z-10">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-[#5D7B6F]/5 text-[#5D7B6F] shadow-inner">
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
          <Link href={`${redirectUrl}?redirect=${typeof window !== 'undefined' ? window.location.pathname : ''}`} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-[#5D7B6F] h-12 px-8 text-xs font-black uppercase tracking-[0.2em] text-white rounded-2xl shadow-lg shadow-[#5D7B6F]/20 hover:bg-[#4a6358] hover:translate-y-[-2px] active:translate-y-0 transition-all">
              Đăng nhập ngay
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          
          <Link href="/register" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full sm:w-auto h-12 px-8 text-xs font-black uppercase tracking-[0.2em] text-[#5D7B6F] rounded-2xl hover:bg-[#5D7B6F]/5 transition-all">
              <UserPlus className="mr-2 h-4 w-4" />
              Tạo tài khoản
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
