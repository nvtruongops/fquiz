'use client'

import { Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { cn } from '@/lib/core/utils/cn'

export const inputClasses = "w-full rounded-2xl border-2 px-4 py-3.5 text-[14px] outline-none transition-all duration-300 font-medium border-white/80 bg-white/50 text-slate-900 placeholder:text-slate-400 hover:border-slate-200 focus:border-[#5D7B6F] focus:bg-white focus:ring-4 focus:ring-[#5D7B6F]/10 shadow-sm"

export function EmailInputWithRetry({
  email,
  setEmail,
  retryAfterSec,
  setRetryAfterSec,
  devCode,
  sendingCode,
  setSendingCode,
  sendCodeFn,
}: {
  email: string
  setEmail: (v: string) => void
  retryAfterSec: number | null
  setRetryAfterSec: (v: number | null) => void
  devCode: string
  sendingCode: boolean
  setSendingCode: (v: boolean) => void
  sendCodeFn: () => void
}) {
  return (
    <div className="space-y-1">
      <label htmlFor="email" className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">
        Email đăng nhập
      </label>
      <div className="relative">
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={sendingCode}
          className={cn(inputClasses, sendingCode && "opacity-60 cursor-not-allowed bg-slate-50")}
        />
        <AnimatePresence>
          {retryAfterSec !== null && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] font-bold text-[#d97706] ml-1 mt-1">
              Vui lòng thử lại sau {retryAfterSec} giây.
            </motion.p>
          )}
          {devCode && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] font-bold text-[#5D7B6F] ml-1 mt-1">
              Mã test (dev): {devCode}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function VerificationCodeInput({
  code,
  setCode,
  onVerify,
  verifying,
}: {
  code: string
  setCode: (v: string) => void
  onVerify: () => void
  verifying: boolean
}) {
  return (
    <div className="space-y-1">
      <label htmlFor="code" className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">
        Mã xác thực
      </label>
      <div className="relative">
        <input
          id="code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Nhập 6 chữ số"
          className={cn(
            inputClasses,
            "placeholder:tracking-normal font-mono",
            code ? "tracking-[0.5em] text-center text-xl py-3" : "tracking-normal"
          )}
        />
      </div>
    </div>
  )
}

export function AuthFormGlowCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#5D7B6F]/20 to-[#A4C3A2]/20 rounded-[2.5rem] blur-xl transition duration-500 opacity-60" />
      <div className="relative bg-white/70 backdrop-blur-2xl rounded-[2.5rem] border border-white/60 p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
        {children}
      </div>
    </div>
  )
}

export function AuthFormHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="mb-6 text-center sm:text-left">
      <h1 className="text-2xl sm:text-[32px] font-black text-slate-800 tracking-tight leading-tight">
        {title}
      </h1>
      <p className="text-slate-500 mt-2 text-sm font-medium">
        {description}
      </p>
    </div>
  )
}

export function AuthFormSuccess({
  title,
  description,
  icon: Icon,
  iconColor,
  button,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  button?: React.ReactNode
}) {
  return (
    <div className="w-full text-center py-8">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/60 p-10"
      >
        <div className={`w-20 h-20 rounded-full bg-${iconColor} flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/50`}>
          <Icon className={`w-10 h-10 text-${iconColor === '#5D7B6F' ? '#0891b2' : '#166534'}`} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">
          {title}
        </h2>
        <p className="text-slate-500 font-medium mb-8 max-w-[280px] mx-auto leading-relaxed">
          {description}
        </p>
        {button}
      </motion.div>
    </div>
  )
}

export function AuthFormSubmitButton({
  loading,
  loadingText,
  icon: Icon,
  iconLabel,
}: {
  loading: boolean
  loadingText?: string
  icon?: React.ComponentType<{ className?: string }>
  iconLabel?: string
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      type="submit"
      disabled={loading}
      className="group relative w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#6B8D7F] to-[#5D7B6F] hover:from-[#5D7B6F] hover:to-[#4A6359] text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-[0_8px_20px_rgba(93,123,111,0.25)] border border-[#7BA090]/50 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
    >
      <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin drop-shadow-sm" />
      ) : (
        <>
          <span className="tracking-wide drop-shadow-sm">{loadingText ?? 'Submit'}</span>
          {Icon && <Icon className="w-4 h-4 group-hover:translate-x-1 transition-transform drop-shadow-sm" />}
        </>
      )}
    </motion.button>
  )
}

export function DevCodeAndRetryMessage({
  retryAfterSec,
  devCode,
}: {
  retryAfterSec: number | null
  devCode: string
}) {
  return (
    <AnimatePresence>
      {retryAfterSec !== null && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-[11px] font-bold text-[#d97706] ml-1 mt-1"
        >
          Vui lòng thử lại sau {retryAfterSec} giây.
        </motion.p>
      )}
      {devCode && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-[11px] font-bold text-[#5D7B6F] ml-1 mt-1"
        >
          Mã test (dev): {devCode}
        </motion.p>
      )}
    </AnimatePresence>
  )
}