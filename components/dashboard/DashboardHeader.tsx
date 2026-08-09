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
    <div className="relative overflow-hidden bg-surface-card-elevated backdrop-blur-xl p-5 sm:p-6 rounded-[28px] border border-strong shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 h-full w-full">
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-start sm:items-center gap-4 relative z-10">
        <Avatar className="h-14 w-14 ring-4 ring-ring-focus/30 shrink-0 shadow-xs">
          {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user?.name || 'User'} />}
          <AvatarFallback className="bg-primary text-primary-foreground font-black text-lg">
            {userInitial}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-tight">
              Xin chào, {user?.name || 'Học viên'}! 👋
            </h1>
            <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-extrabold uppercase rounded-full px-2.5 py-0.5">
              {isDevOrAdmin ? (user?.role === 'admin' ? 'Administrator' : 'Developer') : 'Student Member'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary font-medium">
            Sẵn sàng cho các thử thách trắc nghiệm & bài học hôm nay cùng FQuiz!
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 relative z-10 self-start md:self-auto">
        <Button
          onClick={onRefetch}
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0 rounded-2xl border-subtle text-text-tertiary hover:text-foreground hover:bg-surface-inset cursor-pointer"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className={cn('w-4 h-4', isRefetching && 'animate-spin text-primary')} />
        </Button>
      </div>
    </div>
  )
})
