'use client'

import { useRef, ReactNode } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/core/utils/cn'

interface GsapStaggerContainerProps {
  children: ReactNode
  className?: string
  selector?: string
  stagger?: number
  duration?: number
  y?: number
  dependencies?: any[]
}

export function GsapStaggerContainer({
  children,
  className,
  selector = '.gsap-item',
  stagger = 0.06,
  duration = 0.35,
  y = 14,
  dependencies = [],
}: GsapStaggerContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!containerRef.current) return

      const targets = containerRef.current.querySelectorAll(selector)
      if (targets.length === 0) return

      const mm = gsap.matchMedia()

      mm.add(
        {
          isNormal: '(prefers-reduced-motion: no-preference)',
          isReduced: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { isReduced } = context.conditions!

          gsap.fromTo(
            targets,
            {
              y: isReduced ? 0 : y,
              autoAlpha: 0,
            },
            {
              y: 0,
              autoAlpha: 1,
              stagger: isReduced ? 0 : stagger,
              duration: isReduced ? 0.01 : duration,
              ease: 'power2.out',
              clearProps: 'transform,opacity,visibility',
            }
          )
        },
        containerRef
      )
    },
    { scope: containerRef, dependencies: [selector, stagger, duration, y, ...dependencies] }
  )

  return (
    <div ref={containerRef} className={cn(className)}>
      {children}
    </div>
  )
}
