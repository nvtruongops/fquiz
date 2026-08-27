'use client'

import { ShieldCheck, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AdminHeaderProps {
  user?: {
    username: string
    email?: string
    role: string
  }
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const router = useRouter()

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 px-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Production Admin
        </span>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-foreground leading-tight">{user.username}</div>
              <div className="text-[11px] text-muted-foreground uppercase font-mono">{user.role}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center border border-primary/30 text-sm">
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Đăng xuất"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
