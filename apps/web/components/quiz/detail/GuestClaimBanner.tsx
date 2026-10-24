'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, LogIn, CheckCircle2, Loader2 } from 'lucide-react'
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
  const { data: authData } = useAuth()
  const currentUser = authData?.user ?? null
  const { toast } = useToast()

  const [isClaiming, setIsClaiming] = useState(false)
  const [isClaimed, setIsClaimed] = useState(false)

  const handleClaim = async () => {
    if (!currentUser) {
      const safeCallback = encodeURIComponent(`/quiz/${quizId}/result/${sessionId}`)
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
        throw new Error(data.error || 'Failed to save results')
      }

      setIsClaimed(true)
      toast.success('Quiz results saved to your study profile!')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error saving quiz results')
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
            This quiz result has been successfully saved to your study profile!
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => router.push('/history')}
          className="h-8 px-3 rounded-xl bg-success-fg text-success-bg hover:opacity-90 font-black text-[11px] shrink-0 cursor-pointer"
        >
          View History
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
            Save this quiz to your profile?
          </p>
          <p className="text-[11px] font-medium text-muted-foreground">
            You are viewing as a guest. Sign in to save your score ({score}/{totalQuestions} correct) and analyze mistakes.
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
            <span>Saving...</span>
          </>
        ) : (
          <>
            <LogIn className="w-3.5 h-3.5" />
            <span>{currentUser ? 'Save to my account' : 'Sign in to save results'}</span>
          </>
        )}
      </Button>
    </div>
  )
}
