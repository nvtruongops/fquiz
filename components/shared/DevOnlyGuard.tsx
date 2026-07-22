'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { Sparkles, Bot, Clock, ArrowLeft, Layers, Compass, Loader2 } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { useAuth } from '@/hooks/auth/useAuth'

interface DevOnlyGuardProps {
  children: ReactNode
  featureName?: string
}

export function DevOnlyGuard({ children, featureName = 'Học Ngôn Ngữ AI' }: DevOnlyGuardProps) {
  const { data: authData, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#5D7B6F] animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Đang xác thực quyền truy cập...</p>
      </div>
    )
  }

  const isDevOrAdmin = authData?.user?.role === 'dev' || authData?.user?.role === 'admin'

  if (isDevOrAdmin) {
    return <>{children}</>
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className="relative bg-gradient-to-b from-white to-emerald-50/30 rounded-3xl border border-emerald-100 p-8 sm:p-12 shadow-sm text-center overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Sắp Ra Mắt (Coming Soon)</span>
          </div>

          {/* Icon */}
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-[#5D7B6F] to-teal-600 text-white flex items-center justify-center shadow-lg shadow-[#5D7B6F]/25 transform hover:scale-105 transition-transform">
            <Bot className="w-10 h-10" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Phân Hệ {featureName}
            </h1>
            <p className="text-sm font-medium text-slate-600 leading-relaxed">
              Tính năng Trợ lý AI Ngôn ngữ hiện đang thử nghiệm giới hạn dành cho các tài khoản <span className="font-bold text-[#5D7B6F]">Developer</span>. Chúng tôi đang hoàn thiện trải nghiệm tốt nhất cho người dùng!
            </p>
          </div>

          {/* Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold text-slate-900">Phân tích chuyên sâu</h3>
              <p className="text-[11px] text-slate-500 leading-snug">Học từ vựng, ngữ pháp và kịch bản bằng Gemini AI.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-1">
              <Layers className="w-4 h-4 text-[#5D7B6F]" />
              <h3 className="text-xs font-bold text-slate-900">Lộ trình cá nhân</h3>
              <p className="text-[11px] text-slate-500 leading-snug">Lộ trình bài học tùy chỉnh theo từng cấp độ CEFR/JLPT.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-1">
              <Compass className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-bold text-slate-900">Flashcards tương tác</h3>
              <p className="text-[11px] text-slate-500 leading-snug">Thẻ ghi nhớ thông minh tự động trích xuất từ vựng.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="bg-[#5D7B6F] hover:bg-[#4a6358] rounded-xl text-xs font-bold shadow-md">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay về Trang chủ
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl text-xs font-bold border-slate-200">
              <Link href="/explore">
                <Compass className="w-4 h-4 mr-1.5 text-blue-600" /> Ôn tập Trắc nghiệm
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
