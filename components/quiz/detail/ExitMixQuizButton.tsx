import Link from 'next/link'
import { Library, Compass } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'

interface ExitMixQuizButtonProps {
  sessionId: string
}

export default function ExitMixQuizButton({ sessionId: _sessionId }: ExitMixQuizButtonProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <Link href="/my-quizzes?tab=mix">
        <Button
          className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg sm:rounded-xl bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-bold text-[10px] sm:text-[11px] uppercase tracking-wider shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Library className="w-3.5 h-3.5" />
          <span>Về Bộ đề của tôi</span>
        </Button>
      </Link>

      <Link href="/explore">
        <Button
          variant="outline"
          className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg sm:rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Trang Khám phá</span>
        </Button>
      </Link>
    </div>
  )
}
