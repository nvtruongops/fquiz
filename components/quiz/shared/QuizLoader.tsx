'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Cpu, Database, CheckCircle2, Leaf, Sparkles } from 'lucide-react'

// ── Global suppression flag (time-based, auto-expiring) ──────────────────
// When a quiz-specific loader is active, the global PageTransitionLoader
// should skip triggering to avoid a double-flash.
// Uses a timestamp instead of boolean so the flag auto-expires even if
// cleanup fails (e.g. component unmounts during navigation).
declare global {
  interface Window {
    __QUIZ_LOADER_ACTIVE_UNTIL__?: number
  }
}

export function isQuizLoaderActive(): boolean {
  if (typeof window === 'undefined') return false
  const until = window.__QUIZ_LOADER_ACTIVE_UNTIL__ || 0
  return Date.now() < until
}

/** Activate the flag for durationMs (default 3s). Later calls extend it. */
function activateQuizLoaderFlag(durationMs: number = 3000) {
  if (typeof window !== 'undefined') {
    const newExpiry = Date.now() + durationMs
    window.__QUIZ_LOADER_ACTIVE_UNTIL__ = Math.max(
      window.__QUIZ_LOADER_ACTIVE_UNTIL__ || 0,
      newExpiry,
    )
  }
}

/** Immediately clear the flag (only call on explicit cancel / error). */
function clearQuizLoaderFlag() {
  if (typeof window !== 'undefined') {
    window.__QUIZ_LOADER_ACTIVE_UNTIL__ = 0
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useQuizLoader() {
  const [loadingOverlay, setLoadingOverlay] = useState({ isOpen: false, progress: 0, status: '' })

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (loadingOverlay.isOpen && loadingOverlay.progress < 99) {
      interval = setInterval(() => {
        setLoadingOverlay(prev => {
          if (!prev.isOpen || prev.progress >= 99) return prev
          const increment = (99 - prev.progress) * 0.12 + 0.3
          return { ...prev, progress: Math.min(99, prev.progress + increment) }
        })
      }, 50)
    }
    return () => clearInterval(interval)
  }, [loadingOverlay.isOpen, loadingOverlay.progress])

  const startLoading = useCallback((status: string) => {
    activateQuizLoaderFlag(5000)
    setLoadingOverlay({ isOpen: true, progress: 0, status })
  }, [])

  const completeLoading = useCallback((status: string = 'Hoàn tất!') => {
    // Extend the suppression window so the flag stays active through navigation
    activateQuizLoaderFlag(3000)
    setLoadingOverlay(prev => ({ ...prev, progress: 100, status }))
  }, [])

  const stopLoading = useCallback(() => {
    clearQuizLoaderFlag()
    setLoadingOverlay({ isOpen: false, progress: 0, status: '' })
  }, [])

  const startContinuedLoading = useCallback((status: string) => {
    activateQuizLoaderFlag(5000)
    setLoadingOverlay({ isOpen: true, progress: 85, status })
  }, [])

  const updateStatus = useCallback((status: string) => {
    setLoadingOverlay(prev => ({ ...prev, status }))
  }, [])

  return {
    loadingOverlay,
    startLoading,
    completeLoading,
    stopLoading,
    startContinuedLoading,
    updateStatus,
  }
}

// ── Standalone hook for session pages (manages its own 0→100 animation) ──

export function useSessionLoader() {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const openedAtRef = useRef<number>(0)
  const isNavigatingRef = useRef(false) // Prevents auto-close during navigation

  // Auto-increment from current progress toward 99
  useEffect(() => {
    if (!isOpen || progress >= 99) return
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 99) return prev
        return Math.min(99, prev + (99 - prev) * 0.1 + 0.4)
      })
    }, 50)
    return () => clearInterval(interval)
  }, [isOpen, progress])

  // Auto-close when reaching 100% (only if NOT navigating away)
  useEffect(() => {
    if (progress >= 100 && isOpen && !isNavigatingRef.current) {
      const timer = setTimeout(() => {
        setIsOpen(false)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [progress, isOpen])

  const open = useCallback((initialStatus: string) => {
    activateQuizLoaderFlag(5000)
    isNavigatingRef.current = false
    openedAtRef.current = Date.now()
    setProgress(0)
    setStatus(initialStatus)
    setIsOpen(true)
  }, [])

  const advance = useCallback((to: number, newStatus?: string) => {
    setProgress(prev => Math.max(prev, to))
    if (newStatus) setStatus(newStatus)
  }, [])

  const complete = useCallback(() => {
    const elapsed = Date.now() - openedAtRef.current
    const delayNeeded = Math.max(0, 1000 - elapsed)
    setTimeout(() => {
      setProgress(100)
    }, delayNeeded)
  }, [])

  // Complete to 100%, wait for it to display, then navigate.
  // Blocks auto-close so the overlay stays visible until navigation completes.
  const completeAndNavigate = useCallback((navigateFn: () => void) => {
    isNavigatingRef.current = true             // Block auto-close
    activateQuizLoaderFlag(3000)               // Extend suppression window
    const elapsed = Date.now() - openedAtRef.current
    const delayNeeded = Math.max(0, 1000 - elapsed)
    setTimeout(() => {
      setProgress(100)
      // Wait 400ms for 100% to render visually, then navigate
      setTimeout(() => {
        activateQuizLoaderFlag(3000)           // Re-extend for actual navigation
        navigateFn()
      }, 400)
    }, delayNeeded)
  }, [])

  const close = useCallback(() => {
    clearQuizLoaderFlag()
    isNavigatingRef.current = false
    setIsOpen(false)
    setProgress(0)
  }, [])

  return { isOpen, progress, status, open, advance, complete, completeAndNavigate, close, setStatus }
}

// ── Unified High-End Quiz Loading Overlay Component ────────────────────────

export function QuizLoadingOverlay({
  isOpen,
  progress,
  status,
}: {
  isOpen: boolean
  progress: number
  status: string
}) {
  if (!isOpen) return null

  const pct = Math.min(100, Math.round(progress))

  // SVG Circular Ring Math
  const radius = 130
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pct / 100) * circumference

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[99999] bg-[#16231D]/95 backdrop-blur-2xl flex flex-col items-center justify-between py-10 px-4 font-sans text-white select-none overflow-hidden"
      >
        {/* Background Ambient Glow - Calibrated with ui-colors.md */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#5D7B6F]/40 via-[#A4C3A2]/25 to-transparent rounded-full blur-3xl opacity-75" />
          <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-[#4A6359]/30 rounded-full blur-2xl animate-pulse" />
        </div>

        {/* Top Header Section */}
        <div className="relative z-10 text-center space-y-1.5 pt-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-widest text-[#A4C3A2] drop-shadow-[0_0_16px_rgba(164,195,162,0.75)] uppercase">
            {status || 'ĐANG KHỞI TẠO QUIZ...'}
          </h1>
          <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs font-black tracking-wider text-[#B0D4B8]/90 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A4C3A2]" />
            <span>Vui lòng chờ trong giây lát • Loading Quiz Session</span>
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
                <circle cx="100" cy="151" r="14" fill="url(#coreGradQuizLoader)" stroke="#A4C3A2" strokeWidth="2" />
                <circle cx="100" cy="151" r="7" fill="#F9F9F7" opacity="0.9" />

                {/* Core Gradient */}
                <defs>
                  <radialGradient id="coreGradQuizLoader" cx="50%" cy="50%" r="50%">
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
            <span className="text-[10px] font-black uppercase text-[#A4C3A2] tracking-wider">PREPARING</span>
            <span className="text-2xl font-black text-white font-mono">{pct}%</span>
            <div className="flex gap-1">
              <span className="w-1.5 h-3 bg-[#A4C3A2] rounded-xs animate-pulse" />
              <span className="w-1.5 h-3 bg-[#A4C3A2]/60 rounded-xs" />
              <span className="w-1.5 h-3 bg-[#A4C3A2]/30 rounded-xs" />
            </div>
          </div>

          {/* Right Stats Indicator */}
          <div className="absolute right-[-80px] top-1/2 -translate-y-1/2 hidden md:flex flex-col items-start space-y-1 text-left">
            <span className="text-[10px] font-black uppercase text-[#B0D4B8] tracking-wider">GENERATING...</span>
            <span className="text-[11px] font-bold text-[#EAE7D6]/80 max-w-[100px] leading-tight">LOADING QUESTIONS PLEASE WAIT</span>
          </div>
        </div>

        {/* Bottom Section: Horizontal Progress Bar & Milestones */}
        <div className="relative z-10 w-full max-w-xl space-y-5 px-2">
          {/* Progress Bar & Percentage */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3.5 bg-[#1E2E26] rounded-full p-0.5 border border-[#A4C3A2]/30 overflow-hidden shadow-[inset_0_0_8px_rgba(0,0,0,0.8)]">
              <motion.div
                className="h-full bg-gradient-to-r from-[#5D7B6F] via-[#A4C3A2] to-[#B0D4B8] rounded-full shadow-[0_0_12px_rgba(164,195,162,0.9)]"
                style={{ width: `${pct}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              />
            </div>
            <span className="text-xl font-black text-[#A4C3A2] font-mono tracking-wider w-14 text-right">
              {pct}%
            </span>
          </div>

          {/* Milestone Badges */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className={`flex flex-col items-center space-y-1.5 p-2 rounded-xl border transition-all ${
              pct >= 25 ? 'bg-[#1E2E26] border-[#A4C3A2]/50 text-[#A4C3A2]' : 'bg-[#0F1814]/60 border-slate-800 text-slate-600'
            }`}>
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-black tracking-wider uppercase">SECURE</span>
            </div>

            <div className={`flex flex-col items-center space-y-1.5 p-2 rounded-xl border transition-all ${
              pct >= 50 ? 'bg-[#1E2E26] border-[#A4C3A2]/50 text-[#A4C3A2]' : 'bg-[#0F1814]/60 border-slate-800 text-slate-600'
            }`}>
              <Cpu className="w-4 h-4" />
              <span className="text-[10px] font-black tracking-wider uppercase">PROCESSING</span>
            </div>

            <div className={`flex flex-col items-center space-y-1.5 p-2 rounded-xl border transition-all ${
              pct >= 75 ? 'bg-[#1E2E26] border-[#A4C3A2]/50 text-[#A4C3A2]' : 'bg-[#0F1814]/60 border-slate-800 text-slate-600'
            }`}>
              <Database className="w-4 h-4" />
              <span className="text-[10px] font-black tracking-wider uppercase">LOAD QUESTIONS</span>
            </div>

            <div className={`flex flex-col items-center space-y-1.5 p-2 rounded-xl border transition-all ${
              pct >= 95 ? 'bg-[#1E2E26] border-[#A4C3A2]/50 text-[#A4C3A2]' : 'bg-[#0F1814]/60 border-slate-800 text-slate-600'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[10px] font-black tracking-wider uppercase">READY TO START</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
