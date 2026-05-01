'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2 } from 'lucide-react'
import { withCsrfHeaders } from '@/lib/csrf'

interface FlashcardReviewButtonProps {
  sessionId: string
  quizId: string
  unknownCount: number
  disabled?: boolean
}

export function FlashcardReviewButton({
  sessionId,
  quizId,
  unknownCount,
  disabled = false,
}: FlashcardReviewButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleReview = async () => {
    if (disabled || unknownCount === 0) return

    setIsLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/flashcard-review`,
        {
          method: 'POST',
          headers: withCsrfHeaders(),
        }
      )

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create review session')
      }

      const data = await res.json()
      
      // Redirect back to the same session (now reset with unknown cards)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const reviewUrl = isMobile
        ? `/quiz/${quizId}/session/${data.sessionId}/flashcard/mobile`
        : `/quiz/${quizId}/session/${data.sessionId}/flashcard`
      
      router.push(reviewUrl)
    } catch (error) {
      console.error('Failed to create review session:', error)
      alert('Không thể tạo phiên ôn tập. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  if (unknownCount === 0) {
    return null
  }

  return (
    <Button
      onClick={handleReview}
      disabled={disabled || isLoading}
      variant="outline"
      className="h-10 text-sm font-semibold border-2 border-orange-500 text-orange-600 hover:bg-orange-50 whitespace-nowrap px-3"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">Đang tạo phiên ôn tập...</span>
          <span className="sm:hidden">Đang tạo...</span>
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Ôn lại {unknownCount} câu chưa biết</span>
          <span className="sm:hidden">Ôn lại ({unknownCount})</span>
        </>
      )}
    </Button>
  )
}
