'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useToast } from '@/store/shared/toast-store'

interface RetryWrongButtonProps {
  quizId: string
  sessionId: string
  wrongCount: number
}

export function RetryWrongButton({ quizId, sessionId, wrongCount }: RetryWrongButtonProps) {
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
      const resData = await res.json()
      if (!res.ok) {
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
      className="h-7 sm:h-8 w-full sm:w-auto px-2 sm:px-3 rounded-lg sm:rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9.5px] sm:text-[11px] uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer justify-center"
    >
      {loading ? (
        <Loader2 className="mr-1 h-3 w-3 animate-spin shrink-0" />
      ) : (
        <RotateCcw className="mr-1 h-3 w-3 shrink-0" />
      )}
      Luyện lại {wrongCount} câu sai
    </Button>
  )
}
