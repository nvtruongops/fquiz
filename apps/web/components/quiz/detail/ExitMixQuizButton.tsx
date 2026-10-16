import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'

interface ExitMixQuizButtonProps {
  sessionId: string
}

export default function ExitMixQuizButton({ sessionId: _sessionId }: ExitMixQuizButtonProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <Link href="/explore">
        <Button
          className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg sm:rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] sm:text-[11px] uppercase tracking-wider shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Compass aria-hidden="true" className="w-3.5 h-3.5" />
          <span>Explore Quizzes</span>
        </Button>
      </Link>
    </div>
  )
}
