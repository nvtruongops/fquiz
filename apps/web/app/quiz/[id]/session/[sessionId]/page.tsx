'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import QuizSessionMobilePage from '@/app/quiz/[id]/session/[sessionId]/mobile/page'
import { DesktopSessionContent } from '@/components/quiz/session/DesktopSessionContent'

export default function QuizSessionPage() {
  const params = useParams()
  const quizId = params.id as string
  const sessionId = params.sessionId as string

  const resolvedQuizId = typeof window !== 'undefined' ? quizId : ''
  const resolvedSessionId = typeof window !== 'undefined' ? sessionId : ''

  const [isMobile, setIsMobile] = useState(false)

  if (isMobile) {
    return <QuizSessionMobilePage />
  }

  return (
    <DesktopSessionContent
      quizId={quizId}
      sessionId={sessionId}
      resolvedQuizId={resolvedQuizId}
      resolvedSessionId={resolvedSessionId}
      setIsMobile={setIsMobile}
    />
  )
}
