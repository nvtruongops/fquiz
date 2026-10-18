'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  User,
  Settings,
  LogOut,
  ChevronRight,
  LogIn,
  UserPlus,
  Sun,
  Moon,
  Sparkles,
  Heart,
  Leaf,
} from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/ui/dialog'

interface MobileNavUserSheetProps {
  open: boolean
  user?: { name: string; role: string; avatarUrl?: string } | null
  mounted: boolean
  theme?: string
  onThemeChange: (theme: string) => void
  onLogout: () => void
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

export function MobileNavUserSheet({
  open,
  user,
  mounted,
  theme,
  onThemeChange,
  onLogout,
  onClose,
  triggerRef,
}: MobileNavUserSheetProps) {
  const [avatarError, setAvatarError] = useState(false)
  const [showCustomThemes, setShowCustomThemes] = useState(false)

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U'
  const hasAvatar = !!user?.avatarUrl && !avatarError

  const roleLabel =
    user?.role === 'admin'
      ? 'Admin'
      : user?.role === 'teacher'
      ? 'Teacher'
      : 'Student'

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
        <DialogContent
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (triggerRef.current?.getClientRects().length) triggerRef.current.focus()
            else document.querySelector<HTMLElement>('[data-desktop-nav-home]')?.focus()
          }}
          className="left-1/2 top-auto bottom-0 translate-y-0 w-full max-w-lg bg-card/95 backdrop-blur-2xl border-t border-border/80 rounded-t-[32px] sm:rounded-t-[32px] sm:rounded-b-none shadow-2xl p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] gap-0 overflow-y-auto custom-scrollbar max-h-[85dvh] flex flex-col touch-pan-y lg:hidden"
        >
          <DialogTitle className="sr-only">User Account</DialogTitle>
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20 mx-auto mt-0.5 mb-2.5 shrink-0" />
          {user ? (
            <>
              <div className="p-3 pr-10 bg-muted/40 border border-border/60 rounded-2xl flex items-center justify-between mb-1 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {hasAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarError(true)}
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-primary/30 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-base shrink-0 shadow-xs">
                      {initial}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black text-foreground truncate">{user.name}</span>
                    <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 pb-6 sm:pb-8 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <Link
                  href="/profile"
                  prefetch={false}
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-foreground hover:bg-muted/70 transition-colors active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/15 flex items-center justify-center shrink-0">
                      <User aria-hidden="true" className="w-4 h-4" />
                    </div>
                    <span>Profile</span>
                  </div>
                  <ChevronRight aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                </Link>

                <Link
                  href="/settings"
                  prefetch={false}
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-foreground hover:bg-muted/70 transition-colors active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-muted text-muted-foreground border border-border/50 flex items-center justify-center shrink-0">
                      <Settings aria-hidden="true" className="w-4 h-4" />
                    </div>
                    <span>Account Settings</span>
                  </div>
                  <ChevronRight aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onLogout()
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0">
                      <LogOut aria-hidden="true" className="w-4 h-4" />
                    </div>
                    <span>Sign out</span>
                  </div>
                </button>

                {mounted && (
                  <div className="pt-3 border-t border-border/60 mt-2">
                    <div className="flex items-center justify-between px-2 mb-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        Theme
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-2xl border border-border/60">
                      <button
                        type="button"
                        onClick={() => {
                          onThemeChange('light')
                          setShowCustomThemes(false)
                        }}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                          theme === 'light'
                            ? 'bg-card text-primary shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Sun aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>Light</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onThemeChange('dark')
                          setShowCustomThemes(false)
                        }}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                          theme === 'dark'
                            ? 'bg-card text-primary shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Moon aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>Dark</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomThemes((prev) => !prev)}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                          theme === 'green' || theme === 'pink' || showCustomThemes
                            ? 'bg-card text-primary shadow-xs font-black'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Sparkles aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>Custom</span>
                      </button>
                    </div>

                    {(showCustomThemes || theme === 'green' || theme === 'pink') && (
                      <div className="grid grid-cols-2 gap-1.5 bg-muted/40 p-1.5 rounded-2xl border border-border/50 mt-1.5">
                        <button
                          type="button"
                          onClick={() => onThemeChange('green')}
                          className={cn(
                            'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                            theme === 'green'
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'bg-card text-foreground hover:bg-muted border border-border/60'
                          )}
                        >
                          <Leaf aria-hidden="true" className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Green</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onThemeChange('pink')}
                          className={cn(
                            'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                            theme === 'pink'
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'bg-card text-foreground hover:bg-muted border border-border/60'
                          )}
                        >
                          <Heart aria-hidden="true" className="w-3.5 h-3.5 text-rose-500" />
                          <span>Pink</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="px-2 py-2 pr-10 border-b border-border/60 flex items-center justify-between shrink-0 mb-1">
                <span className="text-xs font-black uppercase tracking-wider text-foreground">
                  FQuiz Account
                </span>
              </div>

              <div className="flex flex-col gap-2 pt-1 pb-6 sm:pb-8 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <Link
                  href="/login"
                  prefetch={false}
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-all active:scale-98"
                >
                  <LogIn aria-hidden="true" className="w-4.5 h-4.5 shrink-0" />
                  <span>Sign in now</span>
                </Link>
                <Link
                  href="/register"
                  prefetch={false}
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold bg-muted/70 hover:bg-muted text-foreground border border-border/60 shadow-xs transition-all active:scale-98"
                >
                  <UserPlus aria-hidden="true" className="w-4.5 h-4.5 shrink-0 text-primary" />
                  <span>Create new account</span>
                </Link>

                {mounted && (
                  <div className="pt-3 border-t border-border/60 mt-2">
                    <div className="flex items-center justify-between px-2 mb-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        Theme
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-2xl border border-border/60">
                      <button
                        type="button"
                        onClick={() => {
                          onThemeChange('light')
                          setShowCustomThemes(false)
                        }}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                          theme === 'light'
                            ? 'bg-card text-primary shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Sun aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>Light</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onThemeChange('dark')
                          setShowCustomThemes(false)
                        }}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                          theme === 'dark'
                            ? 'bg-card text-primary shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Moon aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>Dark</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomThemes((prev) => !prev)}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                          theme === 'green' || theme === 'pink' || showCustomThemes
                            ? 'bg-card text-primary shadow-xs font-black'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Sparkles aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>Custom</span>
                      </button>
                    </div>

                    {(showCustomThemes || theme === 'green' || theme === 'pink') && (
                      <div className="grid grid-cols-2 gap-1.5 bg-muted/40 p-1.5 rounded-2xl border border-border/50 mt-1.5">
                        <button
                          type="button"
                          onClick={() => onThemeChange('green')}
                          className={cn(
                            'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                            theme === 'green'
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'bg-card text-foreground hover:bg-muted border border-border/60'
                          )}
                        >
                          <Leaf aria-hidden="true" className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Green</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onThemeChange('pink')}
                          className={cn(
                            'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                            theme === 'pink'
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'bg-card text-foreground hover:bg-muted border border-border/60'
                          )}
                        >
                          <Heart aria-hidden="true" className="w-3.5 h-3.5 text-rose-500" />
                          <span>Pink</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
    </Dialog>
  )
}
