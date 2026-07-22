'use client'

import React from 'react'
import Link from 'next/link'

interface TopHeaderBarProps {
  user?: { _id?: string; name: string; role: string; avatarUrl?: string } | null
}

export function TopHeaderBar({ user }: TopHeaderBarProps) {
  // If user is already logged in, do not render top header bar on desktop.
  // Left Sidebar already manages User Profile Dropdown & Navigation cleanly.
  if (user) {
    return null
  }

  return (
    <header className="hidden lg:flex items-center justify-between h-14 px-6 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shrink-0 z-30">
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          prefetch={false}
          className="inline-flex items-center justify-center text-xs font-bold text-slate-700 hover:text-[#5D7B6F] px-4 py-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer h-9"
        >
          Đăng nhập
        </Link>
        <Link
          href="/register"
          prefetch={false}
          className="inline-flex items-center justify-center text-xs font-black bg-[#5D7B6F] hover:bg-[#4A6359] text-white px-5 py-2 rounded-xl shadow-xs transition-all cursor-pointer h-9"
        >
          Đăng ký
        </Link>
      </div>
    </header>
  )
}
