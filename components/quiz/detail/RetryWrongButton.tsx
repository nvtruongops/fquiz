'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useToast } from '@/store/shared/toast-store'
import { cn } from '@/lib/core/utils/cn'

interface RetryWrongButtonProps {
  quizId: string
  sessionId: string
  wrongCount: number
  className?: string
}

export function RetryWrongButton({ quizId, sessionId, wrongCount, className }: RetryWrongButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  if (wrongCount <= 0) return null

  const handleRetryWrong = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/retry-wrong`,
        {
          method: 'POST',
          headers: withCsrfHeaders(),
        }
      )
      const resData = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Vui lòng đăng nhập để làm lại các câu sai.')
        }
        throw new Error(resData.error || 'Không thể tạo phiên sửa câu sai')
      }

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      const targetUrl = isMobile
        ? `/quiz/${quizId}/session/${resData.sessionId}/mobile`
        : `/quiz/${quizId}/session/${resData.sessionId}`

      router.push(targetUrl)
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tạo phiên làm lại câu sai')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={handleRetryWrong}
      disabled={loading}
      className={cn(
        "h-8 sm:h-8 px-3 rounded-xl bg-warning-bg text-warning-fg border border-warning-border hover:bg-warning-bg/90 font-black text-[10px] sm:text-[11px] uppercase tracking-wider shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      ) : (
        <RotateCcw className="h-3.5 w-3.5 shrink-0" />
      )}
      Luyện lại {wrongCount} câu sai
    </Button>
  )
}
