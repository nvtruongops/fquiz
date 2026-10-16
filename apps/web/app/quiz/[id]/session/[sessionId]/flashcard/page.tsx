'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Card } from '@/components/shared/ui/card'
import MobileFlashcardSessionPage from '@/app/quiz/[id]/session/[sessionId]/flashcard/mobile/page'
import { DesktopFlashcardView } from '@/components/quiz/flashcard/DesktopFlashcardView'

export default function FlashcardSessionPage() {
  const params = useParams<{ id?: string | string[]; sessionId?: string | string[] }>()

  const rawQuizId = params?.id
  const rawSessionId = params?.sessionId
  const quizId = Array.isArray(rawQuizId) ? rawQuizId[0] : rawQuizId
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId

  const resolvedQuizId = quizId ?? ''
  const resolvedSessionId = sessionId ?? ''

  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!resolvedSessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4">Invalid URL</h2>
          <p className="text-muted-foreground mb-6">Session ID not found in URL</p>
          <Button onClick={() => (window.location.href = '/dashboard')}>Back to Dashboard</Button>
        </Card>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isMobile) {
    return <MobileFlashcardSessionPage />
  }

  return <DesktopFlashcardView quizId={resolvedQuizId} sessionId={resolvedSessionId} />
}
