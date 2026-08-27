'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/core/utils/cn'

interface GsapProgressBarProps {
  progressRatio: number // 0 to 1
  className?: string
  barClassName?: string
  duration?: number
}

export function GsapProgressBar({
  progressRatio,
  className,
  barClassName,
  duration = 0.4,
}: GsapProgressBarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const clampedRatio = Math.min(Math.max(progressRatio, 0), 1)

  useGSAP(
    () => {
      if (!barRef.current) return

      const mm = gsap.matchMedia()

      mm.add(
        {
          isNormal: '(prefers-reduced-motion: no-preference)',
          isReduced: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { isReduced } = context.conditions!

          gsap.to(barRef.current, {
            scaleX: clampedRatio,
            duration: isReduced ? 0.01 : duration,
            ease: 'power1.out',
            overwrite: 'auto',
          })
        },
        containerRef
      )
    },
    { scope: containerRef, dependencies: [clampedRatio, duration] }
  )

  return (
    <div
      ref={containerRef}
      className={cn('w-full h-2 bg-muted/60 rounded-full overflow-hidden', className)}
    >
      <div
        ref={barRef}
        className={cn('h-full bg-primary origin-left scale-x-0 rounded-full', barClassName)}
      />
    </div>
  )
}
