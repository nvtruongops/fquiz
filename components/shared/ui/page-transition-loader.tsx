'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useIsFetching } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Cpu, Database, CheckCircle2, Leaf, Sparkles } from 'lucide-react'
import { isQuizLoaderActive } from '@/components/quiz/shared/QuizLoader'

interface PageTransitionLoaderProps {
  forcedLoading?: boolean
  initialProgress?: number
}

function isExcludedPath(path: string): boolean {
  if (!path) return false
  const cleanPath = path.split('?')[0].split('#')[0]
  const isStatic = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/restore-account', '/terms', '/privacy', '/maintenance'].includes(cleanPath)
  const isQuizRoute = cleanPath.startsWith('/quiz/') || cleanPath.includes('/session/') || cleanPath.includes('/mode') || cleanPath.includes('/result/')
  return isStatic || isQuizRoute
}

export function getLoaderThemeColors(_theme?: string) {
  return {
    bgOverlay: 'bg-background/95',
    headerText: 'text-foreground drop-shadow-[0_0_16px_hsl(var(--foreground)/0.2)]',
    subText: 'text-muted-foreground',
    dotColor: 'bg-primary',
    glowGrad: 'from-primary/20 via-muted/20 to-transparent',
    baseRingBg: 'bg-primary/10 border-primary/20',
    baseRingGlow: 'bg-primary/15',
    trackStroke: 'hsl(var(--muted-foreground) / 0.25)',
    fillStroke: 'hsl(var(--primary))',
    fillDropShadow: 'drop-shadow(0 0 10px hsl(var(--primary)/0.5))',
    mascotGlow: 'bg-primary/20',
    mascotShadow: 'drop-shadow-[0_0_20px_hsl(var(--primary)/0.35)]',
    sproutLeaf1: 'hsl(var(--primary))',
    sproutLeaf2: 'hsl(var(--muted-foreground))',
    sproutStem: 'hsl(var(--foreground) / 0.6)',
    earFill: 'hsl(var(--muted))',
    earStroke: 'hsl(var(--foreground) / 0.5)',
    headFill: 'hsl(var(--card))',
    headStroke: 'hsl(var(--foreground) / 0.65)',
    screenBorder: 'hsl(var(--border))',
    screenFill: 'hsl(var(--muted))',
    eyeColor: 'hsl(var(--foreground))',
    smileColor: 'hsl(var(--foreground))',
    cheekColor: 'hsl(var(--muted-foreground))',
    neckFill: 'hsl(var(--muted))',
    neckStroke: 'hsl(var(--foreground) / 0.5)',
    armFill: 'hsl(var(--card))',
    armStroke: 'hsl(var(--foreground) / 0.65)',
    bodyFill: 'hsl(var(--card))',
    bodyStroke: 'hsl(var(--foreground) / 0.65)',
    coreGradStop1: 'hsl(var(--primary))',
    coreGradStop2: 'hsl(var(--muted-foreground))',
    coreGradStop3: 'hsl(var(--foreground) / 0.5)',
    badgeActiveBg: 'bg-card border-primary/30 text-foreground shadow-xs font-bold',
    badgeInactiveBg: 'bg-muted/60 border-border text-muted-foreground',
    progressTrackBg: 'bg-muted border-border',
    progressFillBg: 'bg-primary',
    percentageText: 'text-foreground',
    statsTitle: 'text-foreground',
  }
}

function PageTransitionLoaderContent({ forcedLoading, initialProgress }: PageTransitionLoaderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFetching = useIsFetching()
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  const [isLoading, setIsLoading] = useState(forcedLoading || false)
  const [progress, setProgress] = useState(initialProgress || 0)
  const [customTitle, setCustomTitle] = useState<string | null>(null)
  const [customSubtitle, setCustomSubtitle] = useState<string | null>(null)
  
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const checkCompletionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const prevPathRef = useRef(pathname)
  const isNavigatingRef = useRef(false)
  const navigationStartedAtRef = useRef<number>(0)
  const routeChangedAtRef = useRef<number | null>(null)

  const activeTheme = (theme === 'system' ? resolvedTheme : theme) || resolvedTheme || 'green'
  const loaderColors = getLoaderThemeColors(mounted ? activeTheme : 'green')

  const finishLoading = React.useCallback(() => {
    if (!isNavigatingRef.current && !isLoading && !forcedLoading) return
    isNavigatingRef.current = false

    if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current)
    if (checkCompletionTimerRef.current) clearTimeout(checkCompletionTimerRef.current)

    setProgress(100)
    setTimeout(() => {
      setIsLoading(false)
      setProgress(0)
      setCustomTitle(null)
      setCustomSubtitle(null)
    }, 200)
  }, [isLoading, forcedLoading])

  const startProgress = React.useCallback(() => {
    setIsLoading(true)
    setProgress(15)

    if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          if (progressTimerRef.current) clearInterval(progressTimerRef.current)
          return 92
        }
        const diff = Math.max(1, Math.floor((92 - prev) / 6))
        return Math.min(92, prev + diff)
      })
    }, 120)

    if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current)
    fallbackTimeoutRef.current = setTimeout(() => {
      finishLoading()
    }, 8000)
  }, [finishLoading])

  useEffect(() => {
    const handleStart = (e: Event) => {
      const customEvent = e as CustomEvent<{ title?: string; subtitle?: string }>
      if (customEvent.detail?.title) setCustomTitle(customEvent.detail.title)
      if (customEvent.detail?.subtitle) setCustomSubtitle(customEvent.detail.subtitle)
      isNavigatingRef.current = true
      startProgress()
    }

    const handleFinish = () => {
      finishLoading()
    }

    window.addEventListener('global-page-loader-start', handleStart)
    window.addEventListener('global-page-loader-finish', handleFinish)

    return () => {
      window.removeEventListener('global-page-loader-start', handleStart)
      window.removeEventListener('global-page-loader-finish', handleFinish)
    }
  }, [startProgress, finishLoading])

  useEffect(() => {
    if (isQuizLoaderActive()) return

    if (pathname !== prevPathRef.current) {
      routeChangedAtRef.current = Date.now()
      prevPathRef.current = pathname

      if (!isExcludedPath(pathname)) {
        isNavigatingRef.current = true
        navigationStartedAtRef.current = Date.now()
        startProgress()
      }
    }
  }, [pathname, searchParams, startProgress])

  useEffect(() => {
    if (!isLoading || forcedLoading) return

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      if (isFetching === 0 && isNavigatingRef.current) {
        finishLoading()
      }
    }, 150)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [isFetching, isLoading, forcedLoading, finishLoading])

  useEffect(() => {
    if (isLoading && !forcedLoading) {
      if (checkCompletionTimerRef.current) clearTimeout(checkCompletionTimerRef.current)
      checkCompletionTimerRef.current = setTimeout(() => {
        finishLoading()
      }, 1500)

      return () => {
        if (checkCompletionTimerRef.current) clearTimeout(checkCompletionTimerRef.current)
      }
    }
  }, [isLoading, forcedLoading, finishLoading])

  useEffect(() => {
    if (forcedLoading) {
      if (isQuizLoaderActive()) return
      startProgress()
    } else if (isLoading && !forcedLoading && !isNavigatingRef.current) {
      finishLoading()
    }
  }, [forcedLoading, isLoading, startProgress, finishLoading])

  if (!isLoading || isQuizLoaderActive() || (forcedLoading && isQuizLoaderActive())) return null

  const radius = 130
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className={`fixed inset-0 z-[99999] ${loaderColors.bgOverlay} backdrop-blur-2xl flex flex-col items-center justify-between py-10 px-4 font-sans select-none overflow-hidden transition-colors duration-300`}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr ${loaderColors.glowGrad} rounded-full blur-3xl opacity-75`} />
        </div>

        <div className="relative z-10 text-center space-y-1.5 pt-2">
          <h1 className={`text-3xl sm:text-4xl font-black tracking-widest ${loaderColors.headerText} uppercase`}>
            {customTitle || 'LOADING...'}
          </h1>
          <div className={`flex items-center justify-center gap-2 text-[11px] sm:text-xs font-black tracking-wider ${loaderColors.subText} uppercase`}>
            <span className={`w-1.5 h-1.5 rounded-full ${loaderColors.dotColor}`} />
            <span>{customSubtitle || 'Vui lòng chờ trong giây lát • Please wait a moment'}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${loaderColors.dotColor}`} />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-center w-[340px] h-[340px] my-auto">
          <svg className="w-[320px] h-[320px] transform -rotate-90">
            <circle
              cx="160"
              cy="160"
              r={radius}
              stroke={loaderColors.trackStroke}
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="160"
              cy="160"
              r={radius}
              stroke={loaderColors.fillStroke}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-300 ease-out"
              style={{ filter: loaderColors.fillDropShadow }}
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <div className={`absolute bottom-2 w-28 h-8 ${loaderColors.mascotGlow} rounded-full blur-md`} />

              <svg className={`w-48 h-48 ${loaderColors.mascotShadow}`} viewBox="0 0 200 200" fill="none">
                <path d="M100 24C92 10 76 8 66 16C56 24 74 38 100 38Z" fill={loaderColors.sproutLeaf1} />
                <path d="M100 24C108 10 124 8 134 16C144 24 126 38 100 38Z" fill={loaderColors.sproutLeaf2} />
                <line x1="100" y1="24" x2="100" y2="44" stroke={loaderColors.sproutStem} strokeWidth="3.5" strokeLinecap="round" />

                <rect x="36" y="66" width="12" height="24" rx="6" fill={loaderColors.earFill} stroke={loaderColors.earStroke} strokeWidth="2.5" />
                <rect x="152" y="66" width="12" height="24" rx="6" fill={loaderColors.earFill} stroke={loaderColors.earStroke} strokeWidth="2.5" />

                <rect x="44" y="44" width="112" height="76" rx="38" fill={loaderColors.headFill} stroke={loaderColors.headStroke} strokeWidth="4" />

                <rect x="54" y="53" width="92" height="58" rx="28" fill={loaderColors.screenBorder} stroke={loaderColors.headStroke} strokeWidth="1.5" />
                <rect x="57" y="56" width="86" height="52" rx="25" fill={loaderColors.screenFill} />

                <path d="M76 76C76 70 85 70 85 76" stroke={loaderColors.eyeColor} strokeWidth="5" strokeLinecap="round" />
                <path d="M115 76C115 70 124 70 124 76" stroke={loaderColors.eyeColor} strokeWidth="5" strokeLinecap="round" />

                <path d="M94 88C97 92 103 92 106 88" stroke={loaderColors.smileColor} strokeWidth="3.5" strokeLinecap="round" />

                <circle cx="70" cy="84" r="5" fill={loaderColors.cheekColor} opacity="0.75" />
                <circle cx="130" cy="84" r="5" fill={loaderColors.cheekColor} opacity="0.75" />

                <rect x="88" y="118" width="24" height="10" rx="4" fill={loaderColors.neckFill} stroke={loaderColors.neckStroke} strokeWidth="2" />

                <path d="M54 134C42 142 40 160 50 168C56 172 64 166 62 156" fill={loaderColors.armFill} stroke={loaderColors.armStroke} strokeWidth="3.5" strokeLinecap="round" />
                <path d="M146 134C158 142 160 160 150 168C144 172 136 166 138 156" fill={loaderColors.armFill} stroke={loaderColors.armStroke} strokeWidth="3.5" strokeLinecap="round" />

                <rect x="62" y="126" width="76" height="50" rx="22" fill={loaderColors.bodyFill} stroke={loaderColors.bodyStroke} strokeWidth="4" />

                <circle cx="100" cy="151" r="14" fill="url(#coreGradPageLoader)" stroke={loaderColors.bodyStroke} strokeWidth="2" />
                <circle cx="100" cy="151" r="7" fill={loaderColors.headFill} opacity="0.9" />

                <defs>
                  <radialGradient id="coreGradPageLoader" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={loaderColors.coreGradStop1} />
                    <stop offset="60%" stopColor={loaderColors.coreGradStop2} />
                    <stop offset="100%" stopColor={loaderColors.coreGradStop3} />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>

          <div className="absolute left-[-60px] top-1/2 -translate-y-1/2 hidden md:flex flex-col items-end space-y-1 text-right">
            <span className={`text-[10px] font-black uppercase ${loaderColors.statsTitle} tracking-wider`}>LOADING</span>
            <span className={`text-2xl font-black ${loaderColors.statsTitle} font-mono`}>{progress}%</span>
          </div>

          <div className="absolute right-[-80px] top-1/2 -translate-y-1/2 hidden md:flex flex-col items-start space-y-1 text-left">
            <span className={`text-[10px] font-black uppercase ${loaderColors.statsTitle} tracking-wider`}>OPTIMIZING...</span>
            <span className={`text-[11px] font-bold ${loaderColors.subText} max-w-[100px] leading-tight`}>DATA PROCESSING PLEASE WAIT</span>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-xl space-y-5 px-2">
          <div className="flex items-center gap-4">
            <div className={`flex-1 h-3.5 ${loaderColors.progressTrackBg} rounded-full p-0.5 overflow-hidden shadow-inner`}>
              <motion.div
                className={`h-full ${loaderColors.progressFillBg} rounded-full shadow-sm`}
                style={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              />
            </div>
            <span className={`text-xl font-black ${loaderColors.percentageText} font-mono tracking-wider w-14 text-right`}>
              {progress}%
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className={`flex flex-col items-center space-y-1.5 p-2 rounded-xl border transition-all ${
              progress >= 25 ? loaderColors.badgeActiveBg : loaderColors.badgeInactiveBg
            }`}>
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-black tracking-wider uppercase">SECURE</span>
            </div>

            <div className={`flex flex-col items-center space-y-1.5 p-2 rounded-xl border transition-all ${
              progress >= 50 ? loaderColors.badgeActiveBg : loaderColors.badgeInactiveBg
            }`}>
              <Cpu className="w-4 h-4" />
              <span className="text-[10px] font-black tracking-wider uppercase">PROCESSING</span>
            </div>

            <div className={`flex flex-col items-center space-y-1.5 p-2 rounded-xl border transition-all ${
              progress >= 75 ? loaderColors.badgeActiveBg : loaderColors.badgeInactiveBg
            }`}>
              <Database className="w-4 h-4" />
              <span className="text-[10px] font-black tracking-wider uppercase">LOADING DATA</span>
            </div>

            <div className={`flex flex-col items-center space-y-1.5 p-2 rounded-xl border transition-all ${
              progress >= 95 ? loaderColors.badgeActiveBg : loaderColors.badgeInactiveBg
            }`}>
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[10px] font-black tracking-wider uppercase">ALMOST DONE</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function PageTransitionLoader(props: PageTransitionLoaderProps) {
  return (
    <Suspense fallback={null}>
      <PageTransitionLoaderContent {...props} />
    </Suspense>
  )
}

export function startGlobalPageLoader(title?: string, subtitle?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('global-page-loader-start', { detail: { title, subtitle } })
    )
  }
}

export function finishGlobalPageLoader() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('global-page-loader-finish'))
  }
}
