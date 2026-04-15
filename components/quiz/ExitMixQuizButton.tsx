'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, Loader2 } from 'lucide-react'
import { withCsrfHeaders } from '@/lib/csrf'

interface ExitMixQuizButtonProps {
  sessionId: string
}

export default function ExitMixQuizButton({ sessionId }: ExitMixQuizButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleExit = async () => {
    setLoading(true)
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/mix/${sessionId}`,
        {
          method: 'DELETE',
          headers: withCsrfHeaders({}),
        }
      )
    } catch {
      // Ignore errors — TTL may have already deleted it
    } finally {
      router.push('/explore')
    }
  }

  return (
    <Button
      onClick={handleExit}
      disabled={loading}
      className="flex items-center gap-2 text-white bg-red-500 hover:bg-red-600"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
      Thoát
    </Button>
  )
}
