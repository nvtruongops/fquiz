import React, { useId } from 'react'
import { cn } from '@/lib/core/utils/cn'

export interface FQuizLogoProps {
  size?: number
  className?: string
  showText?: boolean
  textClassName?: string
}

export const FQuizLogo: React.FC<FQuizLogoProps> = ({
  size = 36,
  className,
  showText = false,
  textClassName,
}) => {
  const instanceId = useId()
  const brandGreenId = `fq-brand-green-${instanceId.replaceAll(':', '')}`
  const goldSparkleId = `fq-gold-sparkle-${instanceId.replaceAll(':', '')}`

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <div style={{ width: size, height: size }} className="relative flex-none flex items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          <defs>
            <linearGradient id={brandGreenId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5D7B6F" />
              <stop offset="100%" stopColor="#2D4A3E" />
            </linearGradient>
            <linearGradient id={goldSparkleId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* Background Rounded Card */}
          <rect x="4" y="4" width="92" height="92" rx="22" fill={`url(#${brandGreenId})`} />

          {/* Book Pages (Left side) */}
          <path
            d="M 18 28 C 24 28 32 30 38 34 V 74 C 32 70 24 68 18 68 V 28 Z"
            fill="#FFFFFF"
            fillOpacity="0.3"
          />
          <path
            d="M 20 25 C 27 25 35 27 41 31 V 71 C 35 67 27 65 20 65 V 25 Z"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* AI Sparkle Stars inside the Book */}
          <path
            d="M 30 40 Q 30 46 36 46 Q 30 46 30 52 Q 30 46 24 46 Q 30 46 30 40 Z"
            fill={`url(#${goldSparkleId})`}
          />
          <path
            d="M 34 32 Q 34 35 37 35 Q 34 35 34 38 Q 34 35 31 35 Q 34 35 34 32 Z"
            fill={`url(#${goldSparkleId})`}
            fillOpacity="0.8"
          />

          {/* Letter 'F' (Right side) */}
          <path
            d="M 48 25 H 78 C 80.2 25 82 26.8 82 29 V 35 C 82 37.2 80.2 39 78 39 H 62 V 46 H 74 C 76.2 46 78 47.8 78 50 V 55 C 78 57.2 76.2 59 74 59 H 62 V 72 C 62 74.2 60.2 76 58 76 H 52 C 49.8 76 48 74.2 48 72 V 25 Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={cn('text-base font-black tracking-tight text-slate-900 leading-none', textClassName)}>
            FQuiz
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-primary mt-0.5">
            AI Language & Exam
          </span>
        </div>
      )}
    </div>
  )
}

export default FQuizLogo
