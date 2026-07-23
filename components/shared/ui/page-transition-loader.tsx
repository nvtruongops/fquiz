'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useIsFetching } from '@tanstack/react-query'
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
  const isQuizSession = cleanPath.includes('/session/') || cleanPath.includes('/mode') || cleanPath.includes('/result/')
  return isStatic || isQuizSession
}

function PageTransitionLoaderContent({ forcedLoading, initialProgress }: PageTransitionLoaderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFetching = useIsFetching()
  
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

  // Finish loading completely (progress 100% -> hold 100% -> fade out)
  const finishLoading = React.useCallback(() => {
    if (!isNavigatingRef.current && !isLoading && !forcedLoading) return
    isNavigatingRef.current = false

    if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current)
    if (checkCompletionTimerRef.current) clearTimeout(checkCompletionTimerRef.current)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    // Fill to 100%
    setProgress(100)

    // Keep visible briefly (150ms for custom action, 400ms standard) before fading out
    const holdMs = customTitle ? 150 : 400
    setTimeout(() => {
      setIsLoading(false)
      setTimeout(() => {
        setProgress(0)
        setCustomTitle(null)
        setCustomSubtitle(null)
      }, 200)
    }, holdMs)
  }, [isLoading, forcedLoading, customTitle])

  // Start progress animation smoothly (deduplicated)
  const startProgress = React.useCallback(() => {
    if (isQuizLoaderActive() || isExcludedPath(pathname)) return

    // If already loading, do not reset progress back to 5%
    if (!isLoading) {
      setIsLoading(true)
      setProgress(5)
    }
    
    isNavigatingRef.current = true
    navigationStartedAtRef.current = Date.now()
    routeChangedAtRef.current = null

    if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current)
    if (checkCompletionTimerRef.current) clearTimeout(checkCompletionTimerRef.current)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    // Smooth increment from current progress up to 92%
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          if (progressTimerRef.current) clearInterval(progressTimerRef.current)
          return 92
        }
        const diff = Math.max(1, Math.floor((95 - prev) / 6))
        return Math.min(92, prev + diff)
      })
    }, 50)

    // Safety fallback timeout (max 6s) to guarantee loader hides even if network hangs
    fallbackTimeoutRef.current = setTimeout(() => {
      finishLoading()
    }, 6000)
  }, [isLoading, pathname, finishLoading])

  // Helper check for elapsed timing
  const isTimingReady = React.useCallback((): boolean => {
    const now = Date.now()
    const totalElapsed = now - navigationStartedAtRef.current
    const minElapsed = customTitle ? 200 : 800
    if (totalElapsed < minElapsed) {
      const waitNeeded = minElapsed - totalElapsed
      if (checkCompletionTimerRef.current) clearTimeout(checkCompletionTimerRef.current)
      checkCompletionTimerRef.current = setTimeout(() => tryFinishLoading(), waitNeeded + 30)
      return false
    }

    if (routeChangedAtRef.current === null && !forcedLoading) {
      if (checkCompletionTimerRef.current) clearTimeout(checkCompletionTimerRef.current)
      checkCompletionTimerRef.current = setTimeout(() => tryFinishLoading(), 100)
      return false
    }

    if (routeChangedAtRef.current) {
      const timeSinceRoute = now - routeChangedAtRef.current
      const minRouteTime = customTitle ? 150 : 400
      if (timeSinceRoute < minRouteTime) {
        const waitNeeded = minRouteTime - timeSinceRoute
        if (checkCompletionTimerRef.current) clearTimeout(checkCompletionTimerRef.current)
        checkCompletionTimerRef.current = setTimeout(() => tryFinishLoading(), waitNeeded + 30)
        return false
      }
    }

    return true
  }, [forcedLoading, customTitle])

  // Check if safe to finish loading (Requires route change + queries settled + debounce)
  const tryFinishLoading = React.useCallback(() => {
    if (!isNavigatingRef.current && !isLoading) return
    if (!isTimingReady()) return

    if (isFetching > 0) {
      if (checkCompletionTimerRef.current) clearTimeout(checkCompletionTimerRef.current)
      checkCompletionTimerRef.current = setTimeout(() => tryFinishLoading(), 150)
      return
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      finishLoading()
    }, 200)
  }, [isLoading, isTimingReady, isFetching, finishLoading])

  // Handle global event triggers (e.g. for logout or explicit custom page load)
  useEffect(() => {
    const handleStart = (e: Event) => {
      const customEvent = e as CustomEvent<{ title?: string; subtitle?: string }>
      if (customEvent.detail?.title) setCustomTitle(customEvent.detail.title)
      if (customEvent.detail?.subtitle) setCustomSubtitle(customEvent.detail.subtitle)
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

  // Handle route change detection
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname
      routeChangedAtRef.current = Date.now()
      
      if (isExcludedPath(pathname)) {
        finishLoading()
        return
      }

      if (checkCompletionTimerRef.current) clearTimeout(checkCompletionTimerRef.current)
      checkCompletionTimerRef.current = setTimeout(() => {
        tryFinishLoading()
      }, 400)
    }
  }, [pathname, searchParams, finishLoading, tryFinishLoading])

  // Watch React Query isFetching status
  useEffect(() => {
    if ((isNavigatingRef.current || isLoading) && isFetching === 0) {
      tryFinishLoading()
    }
  }, [isFetching, isLoading, tryFinishLoading])

  // On page mount / reload (F5): trigger loader if initial queries are fetching
  const isInitialMountRef = useRef(true)
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      if (!isQuizLoaderActive() && (isFetching > 0 || forcedLoading)) {
        startProgress()
      }
    }
  }, [isFetching, forcedLoading, startProgress])

  // Handle link clicks globally to start loading screen immediately
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('//') &&
        !target.getAttribute('target') &&
        !e.ctrlKey &&
        !e.metaKey &&
        href !== window.location.pathname
      ) {
        if (isQuizLoaderActive() || isExcludedPath(href)) return
        startProgress()
      }
    }

    document.addEventListener('click', handleLinkClick)
    return () => document.removeEventListener('click', handleLinkClick)
  }, [startProgress])

  // Sync forced loading prop if present
  useEffect(() => {
    if (forcedLoading) {
      if (isQuizLoaderActive()) return
      startProgress()
    } else if (isLoading && !forcedLoading && !isNavigatingRef.current) {
      finishLoading()
    }
  }, [forcedLoading, isLoading, startProgress, finishLoading])

  // Suppress rendering entirely when quiz loader is active or on excluded path when not navigating
  if (!isLoading || isQuizLoaderActive() || (forcedLoading && isQuizLoaderActive())) return null

  // SVG Circular Ring Math
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
        className="fixed inset-0 z-[99999] bg-[#16231D]/95 backdrop-blur-2xl flex flex-col items-center justify-between py-10 px-4 font-sans text-white select-none overflow-hidden"
      >
        {/* Background Ambient Glow - Calibrated with ui-colors.md (#5D7B6F, #A4C3A2) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#5D7B6F]/40 via-[#A4C3A2]/25 to-transparent rounded-full blur-3xl opacity-75" />
          <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-[#4A6359]/30 rounded-full blur-2xl animate-pulse" />
        </div>

        {/* Top Header Section */}
        <div className="relative z-10 text-center space-y-1.5 pt-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-widest text-[#A4C3A2] drop-shadow-[0_0_16px_rgba(164,195,162,0.75)] uppercase">
            {customTitle || 'LOADING...'}
          </h1>
          <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs font-black tracking-wider text-[#B0D4B8]/90 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A4C3A2]" />
            <span>{customSubtitle || 'Vui lòng chờ trong giây lát • Please wait a moment'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#A4C3A2]" />
          </div>
        </div>

        {/* Central Graphic Section (Mascot Robot + Circular Progress Ring) */}
        <div className="relative z-10 flex items-center justify-center w-[340px] h-[340px] my-auto">
          {/* Holographic Base Ring */}
          <div className="absolute bottom-2 w-64 h-16 bg-[#A4C3A2]/15 rounded-full blur-md border border-[#A4C3A2]/40 transform rotate-x-60" />
          <div className="absolute bottom-4 w-48 h-10 bg-[#5D7B6F]/30 rounded-full blur-xs" />

          {/* SVG Circular Progress Bar */}
          <svg className="w-[320px] h-[320px] transform -rotate-90">
            {/* Background Track Ring */}
            <circle
              cx="160"
              cy="160"
              r={radius}
              className="stroke-[#1E2E26]"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Animated Progress Ring */}
            <circle
              cx="160"
              cy="160"
              r={radius}
              className="stroke-[#A4C3A2] transition-all duration-300 ease-out"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ filter: 'drop-shadow(0 0 10px rgba(164, 195, 162, 0.85))' }}
            />
          </svg>

          {/* Center Mascot: AI Robot Sprout with Proper Proportions & Glowing Core */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Soft Ambient Glow under Mascot */}
              <div className="absolute bottom-2 w-28 h-8 bg-[#A4C3A2]/25 rounded-full blur-md" />

              {/* Perfectly Proportioned Robot Mascot SVG based on Docs/ui-colors.md */}
              <svg className="w-48 h-48 drop-shadow-[0_0_20px_rgba(164,195,162,0.55)]" viewBox="0 0 200 200" fill="none">
                {/* Sprout Leaves on Antenna */}
                <path d="M100 24C92 10 76 8 66 16C56 24 74 38 100 38Z" fill="#A4C3A2" />
                <path d="M100 24C108 10 124 8 134 16C144 24 126 38 100 38Z" fill="#B0D4B8" />
                <line x1="100" y1="24" x2="100" y2="44" stroke="#5D7B6F" strokeWidth="3.5" strokeLinecap="round" />

                {/* Robot Ears / Side Knobs */}
                <rect x="36" y="66" width="12" height="24" rx="6" fill="#A4C3A2" stroke="#5D7B6F" strokeWidth="2.5" />
                <rect x="152" y="66" width="12" height="24" rx="6" fill="#A4C3A2" stroke="#5D7B6F" strokeWidth="2.5" />

                {/* Head Outer Shell - Bright White-Cream (#F9F9F7) */}
                <rect x="44" y="44" width="112" height="76" rx="38" fill="#F9F9F7" stroke="#A4C3A2" strokeWidth="4" />

                {/* Face Screen - Glowing Bright Mint/Cyan Screen (#D7F9FA) */}
                <rect x="54" y="53" width="92" height="58" rx="28" fill="#B0D4B8" stroke="#A4C3A2" strokeWidth="1.5" />
                <rect x="57" y="56" width="86" height="52" rx="25" fill="#D7F9FA" />

                {/* Cute Eyes (#16231D) */}
                <path d="M76 76C76 70 85 70 85 76" stroke="#16231D" strokeWidth="5" strokeLinecap="round" />
                <path d="M115 76C115 70 124 70 124 76" stroke="#16231D" strokeWidth="5" strokeLinecap="round" />

                {/* Smile */}
                <path d="M94 88C97 92 103 92 106 88" stroke="#16231D" strokeWidth="3.5" strokeLinecap="round" />

                {/* Blush Cheeks */}
                <circle cx="70" cy="84" r="5" fill="#A4C3A2" opacity="0.75" />
                <circle cx="130" cy="84" r="5" fill="#A4C3A2" opacity="0.75" />

                {/* Neck Connector */}
                <rect x="88" y="118" width="24" height="10" rx="4" fill="#A4C3A2" stroke="#5D7B6F" strokeWidth="2" />

                {/* Robot Arms (Left & Right) */}
                <path d="M54 134C42 142 40 160 50 168C56 172 64 166 62 156" fill="#F9F9F7" stroke="#A4C3A2" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M146 134C158 142 160 160 150 168C144 172 136 166 138 156" fill="#F9F9F7" stroke="#A4C3A2" strokeWidth="3.5" strokeLinecap="round" />

                {/* Body Torso - Bright White-Cream (#F9F9F7) */}
                <rect x="62" y="126" width="76" height="50" rx="22" fill="#F9F9F7" stroke="#A4C3A2" strokeWidth="4" />

                {/* Glowing Energy Core Orb on Chest */}
                <circle cx="100" cy="151" r="14" fill="url(#coreGradPageLoader)" stroke="#A4C3A2" strokeWidth="2" />
                <circle cx="100" cy="151" r="7" fill="#F9F9F7" opacity="0.9" />

                {/* Core Gradient */}
                <defs>
                  <radialGradient id="coreGradPageLoader" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#D7F9FA" />
                    <stop offset="60%" stopColor="#A4C3A2" />
                    <stop offset="100%" stopColor="#5D7B6F" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Left Stats Indicator */}
          <div className="absolute left-[-60px] top-1/2 -translate-y-1/2 hidden md:flex flex-col items-end space-y-1 text-right">
            <span className="text-[10px] font-black uppercase text-[#A4C3A2] tracking-wider">LOADING</span>
            <span className="text-2xl font-black text-white font-mono">{progress}%</span>
            <div className="flex gap-1">
              <span className="w-1.5 h-3 bg-[#A4C3A2] rounded-xs animate-pulse" />
              <span className="w-1.5 h-3 bg-[#A4C3A2]/60 rounded-xs" />
              <span className="w-1.5 h-3 bg-[#A4C3A2]/30 rounded-xs" />
            </div>
          </div>

          {/* Right Stats Indicator */}
          <div className="absolute right-[-80px] top-1/2 -translate-y-1/2 hidden md:flex flex-col items-start space-y-1 text-left">
            <span className="text-[10px] font-black uppercase text-[#B0D4B8] tracking-wider">OPTIMIZING...</span>
            <span className="text-[11px] font-bold text-[#EAE7D6]/80 max-w-[100px] leading-tight">DATA PROCESSING PLEASE WAIT</span>
          </div>
        </div>

        {/* Bottom Section: Horizontal Progress Bar & Milestones */}
        <div className="relative z-10 w-full max-w-xl space-y-5 px-2">
          {/* Progress Bar & Percentage */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3.5 bg-[#1E2E26] rounded-full p-0.5 border border-[#A4C3A2]/30 overflow-hidden shadow-[inset_0_0_8px_rgba(0,0,0,0.8)]">
              <motion.div
                className="h-full bg-gradient-to-r from-[#5D7B6F] via-[#A4C3A2] to-[#B0D4B8] rounded-full shadow-[0_0_12px_rgba(164,195,162,0.9)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              />
            </div>
            <span className="text-xl font-black text-[#A4C3A2] font-mono tracking-wider w-14 text-right">
              {progress}%
            </span>
          </div>

          {/* Milestone Badges */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className={`flex flex-col items-center space-y-1.5 p-2 rounded-xl border transition-all ${
              progress >= 25 ? 'bg-[#1E2E26] border-[#A4C3A2]/50 text-[#A4C3A2]' : 'bg-[#0F1814]/60 border-slate-800 text-slate-600'
            }`}>
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-black tracking-wider uppercase">SECURE</span>
            </div>

            <div className={`flex flex-col items-center space-y-1.5 p-2 rounded-xl border transition-all ${
              progress >= 50 ? 'bg-[#1E2E26] border-[#A4C3A2]/50 text-[#A4C3A2]' : 'bg-[#0F1814]/60 border-slate-800 text-slate-600'
            }`}>
              <Cpu className="w-4 h-4" />
              <span className="text-[10px] font-black tracking-wider uppercase">PROCESSING</span>
            </div>

            <div className={`flex flex-col items-center space-y-1.5 p-2 rounded-xl border transition-all ${
              progress >= 75 ? 'bg-[#1E2E26] border-[#A4C3A2]/50 text-[#A4C3A2]' : 'bg-[#0F1814]/60 border-slate-800 text-slate-600'
            }`}>
              <Database className="w-4 h-4" />
              <span className="text-[10px] font-black tracking-wider uppercase">LOADING DATA</span>
            </div>

            <div className={`flex flex-col items-center space-y-1.5 p-2 rounded-xl border transition-all ${
              progress >= 95 ? 'bg-[#1E2E26] border-[#A4C3A2]/50 text-[#A4C3A2]' : 'bg-[#0F1814]/60 border-slate-800 text-slate-600'
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
