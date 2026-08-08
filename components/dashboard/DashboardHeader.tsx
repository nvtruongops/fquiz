'use client'

import React from 'react'
import Link from 'next/link'
import { Compass, RefreshCw } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/ui/avatar'
import { cn } from '@/lib/core/utils/cn'

interface DashboardHeaderProps {
  user: { name?: string; role?: string; avatarUrl?: string } | null
  userInitial: string
  isDevOrAdmin: boolean
  isRefetching: boolean
  onRefetch: () => void
}

export const DashboardHeader = React.memo(function DashboardHeader({
  user,
  userInitial,
  isDevOrAdmin,
  isRefetching,
  onRefetch,
}: DashboardHeaderProps) {
  return (
    <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl p-5 sm:p-7 rounded-[28px] border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-gradient-to-br from-[#5D7B6F]/10 via-[#A4C3A2]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-start sm:items-center gap-4 relative z-10">
        <Avatar className="h-14 w-14 ring-4 ring-[#5D7B6F]/15 shrink-0 shadow-xs">
          {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user?.name || 'User'} />}
          <AvatarFallback className="bg-gradient-to-br from-[#5D7B6F] to-[#4A6359] text-white font-black text-lg">
            {userInitial}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
              Xin chào, {user?.name || 'Học viên'}! 👋
            </h1>
            <Badge className="bg-[#5D7B6F]/10 text-[#5D7B6F] border border-[#5D7B6F]/25 text-[10px] font-extrabold uppercase rounded-full px-2.5 py-0.5">
              {isDevOrAdmin ? (user?.role === 'admin' ? 'Administrator' : 'Developer') : 'Student Member'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Sẵn sàng cho các thử thách trắc nghiệm & bài học hôm nay cùng FQuiz!
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 relative z-10 self-start md:self-auto">
        <Button
          onClick={onRefetch}
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0 rounded-2xl border-slate-200 text-slate-500 hover:text-[#5D7B6F] hover:bg-slate-50"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className={cn('w-4 h-4', isRefetching && 'animate-spin text-[#5D7B6F]')} />
        </Button>
        <Button asChild size="sm" className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-black text-xs h-10 px-5 rounded-2xl shadow-xs transition-all">
          <Link href="/explore">
            <Compass className="w-4 h-4 mr-2" /> Khám phá đề thi
          </Link>
        </Button>
      </div>
    </div>
  )
})
