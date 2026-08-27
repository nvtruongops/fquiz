'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function QuizModeRedirectPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id

  useEffect(() => {
    if (id) {
      router.replace(`/quiz/${id}?selectMode=true`)
    }
  }, [id, router])

  return (
    <div className="flex h-screen items-center justify-center bg-page-bg">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
