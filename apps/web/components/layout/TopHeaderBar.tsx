'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface TopHeaderBarProps {
  user?: { _id?: string; name: string; role: string; avatarUrl?: string } | null
}

export function TopHeaderBar({ user }: TopHeaderBarProps) {
  const pathname = usePathname()

  // If user is already logged in, do not render top header bar on desktop.
  if (user) {
    return null
  }

  const isGenericPath = !pathname || ['/', '/login', '/register', '/forgot-password', '/reset-password'].includes(pathname)
  const callbackUrl = isGenericPath ? '' : encodeURIComponent(pathname)
  const loginHref = callbackUrl ? `/login?callbackUrl=${callbackUrl}` : '/login'
  const registerHref = callbackUrl ? `/register?callbackUrl=${callbackUrl}` : '/register'

  return (
    <header className="hidden lg:flex items-center justify-between h-14 px-6 border-b border-border bg-card/90 backdrop-blur-md shrink-0 z-30">
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <Link
          href={loginHref}
          prefetch={false}
          className="inline-flex items-center justify-center text-xs font-bold text-foreground hover:text-primary px-4 py-2 rounded-xl hover:bg-muted transition-all cursor-pointer h-9"
        >
          Đăng nhập
        </Link>
        <Link
          href={registerHref}
          prefetch={false}
          className="inline-flex items-center justify-center text-xs font-black bg-primary hover:bg-primary-hover text-primary-foreground px-5 py-2 rounded-xl shadow-xs transition-all cursor-pointer h-9"
        >
          Đăng ký
        </Link>
      </div>
    </header>
  )
}
