'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, LogIn, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { useAuth } from '@/hooks/auth/useAuth'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

interface GuestClaimBannerProps {
  sessionId: string
  quizId: string
  score: number
  totalQuestions: number
}

export function GuestClaimBanner({
  sessionId,
  quizId,
  score,
  totalQuestions,
}: GuestClaimBannerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: authData } = useAuth()
  const currentUser = authData?.user ?? null
  const { toast } = useToast()

  const [isClaiming, setIsClaiming] = useState(false)
  const [isClaimed, setIsClaimed] = useState(false)

  // Auto-claim if returning from login with ?claim=true
  useEffect(() => {
    if (searchParams.get('claim') === 'true' && currentUser && !isClaimed && !isClaiming) {
      handleClaim()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, searchParams])

  const handleClaim = async () => {
    if (!currentUser) {
      const safeCallback = encodeURIComponent(`/quiz/${quizId}/result/${sessionId}?claim=true`)
      router.push(`/login?callbackUrl=${safeCallback}`)
      return
    }

    setIsClaiming(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/claim`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Không thể lưu kết quả')
      }

      setIsClaimed(true)
      toast.success('Đã lưu kết quả bài thi vào Hồ sơ học tập của bạn!')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu kết quả bài thi')
    } finally {
      setIsClaiming(false)
    }
  }

  if (isClaimed) {
    return (
      <div className="flex items-center justify-between gap-3 bg-success-bg border border-success-border text-success-fg rounded-2xl px-4 py-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-success-fg" />
          <p className="text-xs font-bold">
            Kết quả bài thi này đã được lưu vào Hồ sơ học tập của bạn thành công!
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => router.push('/history')}
          className="h-8 px-3 rounded-xl bg-success-fg text-success-bg hover:opacity-90 font-black text-[11px] shrink-0 cursor-pointer"
        >
          Xem Lịch sử
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-primary/10 border border-primary/25 text-foreground rounded-2xl p-3.5 sm:px-4 sm:py-3 shrink-0 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-black text-foreground">
            Lưu bài thi này vào Hồ sơ cá nhân?
          </p>
          <p className="text-[11px] font-medium text-muted-foreground">
            Bạn đang xem với tư cách Khách. Đăng nhập để lưu điểm số ({score}/{totalQuestions} câu đúng) và phân tích câu sai.
          </p>
        </div>
      </div>

      <Button
        size="sm"
        onClick={handleClaim}
        disabled={isClaiming}
        className="w-full sm:w-auto h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-xs shrink-0 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
      >
        {isClaiming ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Đang lưu...</span>
          </>
        ) : (
          <>
            <LogIn className="w-3.5 h-3.5" />
            <span>{currentUser ? 'Lưu vào tài khoản của tôi' : 'Đăng nhập để lưu kết quả'}</span>
          </>
        )}
      </Button>
    </div>
  )
}
