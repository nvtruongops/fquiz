'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowRight, Zap, Bot, Flame, CheckCircle2, Award, Target, Compass, Loader2
} from 'lucide-react'

import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/ui/avatar'
import { Progress } from '@/components/shared/ui/progress'
import { cn } from '@/lib/core/utils/cn'

import { useStudentDashboard } from '@/hooks/useStudentDashboard'

export default function DashboardPage() {
  const {
    user,
    isDevOrAdmin,
    isLoading,
    primaryIncomplete,
    stats,
    avgScoreNum,
    userInitial,
  } = useStudentDashboard()

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#5D7B6F] mx-auto" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 font-sans text-slate-800 pb-6 p-6">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-[#5D7B6F]/20 shrink-0">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user?.name || 'User'} />}
            <AvatarFallback className="bg-[#5D7B6F] text-white font-black text-xs">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight">
                Xin chào, {user?.name || 'Học viên'}! 👋
              </h1>
              <Badge className="bg-[#5D7B6F]/10 text-[#5D7B6F] border border-[#5D7B6F]/20 text-[9px] font-extrabold uppercase rounded-full px-2 py-0.5">
                {isDevOrAdmin ? (user?.role === 'admin' ? 'Administrator' : 'Developer') : 'Student Member'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium">Chào mừng bạn quay lại hệ thống ôn luyện FQuiz.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs">
            <Link href="/explore">
              <Compass className="w-3.5 h-3.5 mr-1.5" /> Khám phá khóa học
            </Link>
          </Button>
        </div>
      </div>

      {/* Incomplete Session Banner */}
      {primaryIncomplete && (
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-xs">
          <div className="bg-slate-900 px-4 py-3 rounded-[14px] text-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Flame className="w-5 h-5 text-amber-400 animate-bounce shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-amber-300">Đang dở dang • {primaryIncomplete.quizCode}</span>
                <h3 className="text-xs sm:text-sm font-black truncate">{primaryIncomplete.quizTitle}</h3>
              </div>
            </div>

            <Button asChild size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs h-8 px-4">
              <Link href={`/quiz/${primaryIncomplete.quizId}/session/${primaryIncomplete.activeSessionId || primaryIncomplete.id}`}>
                Tiếp tục ngay <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <CheckCircle2 className="w-6 h-6 text-[#5D7B6F]" />
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Đã Hoàn Thành</span>
            <span className="text-lg font-black text-slate-900">{stats.totalQuizzes || 0} bài</span>
          </div>
        </div>

        <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <Award className="w-6 h-6 text-blue-600" />
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Điểm TB</span>
            <span className="text-lg font-black text-blue-600">{avgScoreNum.toFixed(1)} / 10</span>
          </div>
        </div>

        <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <Target className="w-6 h-6 text-emerald-600" />
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Câu Đúng</span>
            <span className="text-lg font-black text-emerald-600">{stats.totalCorrectAnswers || 0}</span>
          </div>
        </div>

        <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400 uppercase text-[10px]">Hoàn Thiện</span>
            <span className="text-purple-600 font-black">{Math.min(Math.round(avgScoreNum * 10), 100)}%</span>
          </div>
          <Progress value={Math.min(avgScoreNum * 10, 100)} className="h-2 bg-slate-100 mt-2 rounded-full" />
        </div>
      </div>
    </div>
  )
}
