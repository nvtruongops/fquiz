'use client'

import React, { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'

interface ScrollToTopButtonProps {
  threshold?: number
  className?: string
}

export function ScrollToTopButton({ threshold = 300, className }: Readonly<ScrollToTopButtonProps>) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    let ticking = false
    let lastVisible = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const visible = window.scrollY > threshold
          if (visible !== lastVisible) {
            lastVisible = visible
            setIsVisible(visible)
          }
          ticking = false
        })
        ticking = true
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Cuộn lên đầu trang"
      title="Cuộn lên đầu trang"
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center justify-center p-3.5 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 border border-white/20 transition-all duration-300 transform active:scale-95 group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-6 pointer-events-none',
        className
      )}
    >
      <ArrowUp className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
    </button>
  )
}
