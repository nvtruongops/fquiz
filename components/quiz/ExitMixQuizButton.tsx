'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, Loader2 } from 'lucide-react'

interface ExitMixQuizButtonProps {
  sessionId: string
}

export default function ExitMixQuizButton({ sessionId }: ExitMixQuizButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleExit = () => {
    setLoading(true)
    // Session đã completed — giữ lại trong lịch sử, chỉ redirect về explore
    router.push('/explore')
  }

  return (
    <Button
      onClick={handleExit}
      disabled={loading}
      variant="outline"
      className="flex items-center gap-2 border-[#5D7B6F] text-[#5D7B6F] hover:bg-[#5D7B6F]/10"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
      Về trang Khám phá
    </Button>
  )
}
