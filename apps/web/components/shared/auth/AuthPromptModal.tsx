'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/shared/ui/dialog'
import { useAuthPrompt } from '@/store/shared/auth-prompt-store'
import { LogIn, UserPlus, Lock, X, Sun, Moon, Sparkles, Leaf, Heart } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/core/utils/cn'

export function AuthPromptModal() {
  const { isOpen, title, description, featureName, targetUrl, closeAuthPrompt } = useAuthPrompt()
  const [mounted, setMounted] = useState(false)
  const [showCustomThemes, setShowCustomThemes] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      ;(window as any).__openAuthPrompt = (opts: any) => useAuthPrompt.getState().openAuthPrompt(opts)
    }
  }, [])

  const callbackParam = targetUrl ? `?callbackUrl=${encodeURIComponent(targetUrl)}` : ''
  const loginHref = `/login${callbackParam}`
  const registerHref = `/register${callbackParam}`

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeAuthPrompt() }}>
      <DialogContent className="[&>button:last-child]:hidden fixed left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 w-full max-w-none rounded-t-[28px] sm:rounded-3xl rounded-b-none sm:rounded-b-3xl border-x-0 border-b-0 sm:border border-t border-border p-4 sm:p-6 pb-6 sm:pb-6 bg-card text-card-foreground shadow-2xl duration-300 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom sm:left-[50%] sm:top-[50%] sm:bottom-auto sm:right-auto sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-[400px] sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95">
        {/* Mobile Top Grab Handle */}
        <div className="w-12 h-1.5 rounded-full bg-muted-foreground/25 mx-auto mb-2 sm:hidden pointer-events-none" />

        {/* Header with Title & Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div className="flex items-center gap-2 min-w-0">
            {featureName ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-wider border border-primary/20">
                <Lock className="w-3 h-3" />
                <span>{featureName}</span>
              </span>
            ) : (
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Tài khoản FQuiz
              </span>
            )}
          </div>

          <DialogClose asChild>
            <button
              type="button"
              className="w-7 h-7 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer active:scale-95"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </DialogClose>
        </div>

        {/* Modal Body */}
        <div className="space-y-3 pt-1">
          <div className="space-y-1 text-left">
            <DialogTitle className="text-base sm:text-lg font-black text-foreground tracking-tight leading-snug">
              {title || 'Yêu cầu Đăng nhập'}
            </DialogTitle>

            <DialogDescription className="text-xs text-muted-foreground font-medium leading-relaxed">
              {description || 'Vui lòng đăng nhập hoặc tạo tài khoản để sử dụng tính năng này.'}
            </DialogDescription>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 pt-1">
            <Link
              href={loginHref}
              onClick={closeAuthPrompt}
              prefetch={false}
              className="w-full flex items-center justify-center gap-2.5 h-11 sm:h-12 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-black shadow-xs transition-all cursor-pointer active:scale-98"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập ngay</span>
            </Link>

            <Link
              href={registerHref}
              onClick={closeAuthPrompt}
              prefetch={false}
              className="w-full flex items-center justify-center gap-2.5 h-11 sm:h-12 px-4 rounded-2xl border border-border/70 bg-muted hover:bg-muted/80 text-foreground text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer active:scale-98"
            >
              <UserPlus className="w-4 h-4 text-primary" />
              <span>Đăng ký tài khoản mới</span>
            </Link>
          </div>

          {/* Theme Selector (Matching Image 2 on Mobile) */}
          {mounted && (
            <div className="pt-3 border-t border-border/80">
              <div className="flex items-center justify-between px-1 mb-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Giao diện
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-2xl border border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    handleThemeChange('light')
                    setShowCustomThemes(false)
                  }}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                    theme === 'light' ? 'bg-card text-primary shadow-xs font-black' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Sáng</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleThemeChange('dark')
                    setShowCustomThemes(false)
                  }}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                    theme === 'dark' ? 'bg-card text-primary shadow-xs font-black' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Tối</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomThemes((prev) => !prev)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                    theme === 'green' || theme === 'pink' || showCustomThemes ? 'bg-card text-primary shadow-xs font-black' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tùy chỉnh</span>
                </button>
              </div>

              {(showCustomThemes || theme === 'green' || theme === 'pink') && (
                <div className="grid grid-cols-2 gap-1.5 bg-muted/40 p-1.5 rounded-2xl border border-border/50 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <button
                    type="button"
                    onClick={() => handleThemeChange('green')}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                      theme === 'green' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-card text-foreground hover:bg-muted border border-border/60'
                    )}
                  >
                    <Leaf className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Green</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange('pink')}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                      theme === 'pink' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-card text-foreground hover:bg-muted border border-border/60'
                    )}
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>Pink</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Dismiss button */}
          <button
            type="button"
            onClick={closeAuthPrompt}
            className="w-full text-center pt-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Để sau / Tiếp tục xem
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
