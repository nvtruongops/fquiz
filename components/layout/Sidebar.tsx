'use client'

import React, { useState, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/core/utils/cn'
import {
  Map, Layers, Bot, FileText, Library, History,
  LayoutDashboard, TrendingUp, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Context ─────────────────────────────────────────────────────
interface SContext { collapsed: boolean; toggle: () => void }
const SidebarContext = createContext<SContext>({ collapsed: false, toggle: () => {} })
export const useSidebar = () => useContext(SidebarContext)

// ─── Data ────────────────────────────────────────────────────────
interface NavItem { label: string; href: string; icon: React.ComponentType<{ className?: string }>; soon?: boolean }
interface Section { id: string; title: string; items: NavItem[] }

const sections: Section[] = [
  {
    id: 'study', title: 'Study',
    items: [
      { label: 'Lộ trình', href: '/roadmap', icon: Map },
      { label: 'Flashcards', href: '/flashcards', icon: Layers },
      { label: 'AI Assistant', href: '/ai', icon: Bot, soon: true },
    ],
  },
  {
    id: 'test', title: 'Test',
    items: [
      { label: 'Đề thi', href: '/my-quizzes', icon: FileText },
      { label: 'Ngân hàng câu hỏi', href: '/my-quizzes?tab=bank', icon: Library },
      { label: 'Lịch sử', href: '/history', icon: History },
    ],
  },
  {
    id: 'analytics', title: 'Analytics',
    items: [
      { label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Tiến độ', href: '/analytics', icon: TrendingUp },
    ],
  },
]

// ─── Component ───────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)

  const isActive = (item: NavItem) => {
    if (item.soon) return false
    if (item.href === '/my-quizzes') return pathname === '/my-quizzes' || pathname?.startsWith('/create')
    return pathname === item.href || pathname?.startsWith(item.href + '/')
  }

  return (
    <SidebarContext.Provider value={{ collapsed, toggle: () => setCollapsed(p => !p) }}>
      <aside className="hidden md:block">
        <AnimatePresence initial={false}>
          <motion.div
            animate={{ width: collapsed ? 64 : 240 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed left-4 top-24 bottom-8 z-40 bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col overflow-hidden"
          >
            <button onClick={() => setCollapsed(p => !p)}
              className="absolute -right-3 top-8 z-50 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-600">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6 scrollbar-thin">
              {sections.map(sec => (
                <div key={sec.id}>
                  {!collapsed && (
                    <motion.p initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                      className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-3 px-2">{sec.title}</motion.p>
                  )}
                  <div className="space-y-1">
                    {sec.items.map(item => {
                      const active = isActive(item); const Icon = item.icon
                      return (
                        <Link key={item.href + item.label} href={item.soon ? '#' : item.href}
                          prefetch={false}
                          onClick={e => item.soon && e.preventDefault()} title={collapsed ? item.label : undefined}
                          className={cn('relative flex items-center gap-3 px-2.5 py-2.5 rounded-[14px] transition-all duration-200 group',
                            item.soon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                            active ? 'bg-[#5D7B6F]/10 text-[#5D7B6F]' : 'text-slate-500 hover:text-slate-800 hover:bg-white/60')}>
                          {active && <motion.div layoutId="sidebar-active" className="absolute inset-0 bg-[#5D7B6F]/10 rounded-[14px]" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                          <Icon className={cn('w-5 h-5 flex-shrink-0 relative z-10', active ? 'text-[#5D7B6F]' : 'text-slate-400 group-hover:text-slate-600')} />
                          {!collapsed && (
                            <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                              className="text-sm font-semibold whitespace-nowrap overflow-hidden relative z-10">
                              {item.label}
                              {item.soon && <span className="ml-1.5 text-[10px] font-medium text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">Soon</span>}
                            </motion.span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="px-3 pb-4">
              {!collapsed && <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-3" />}
              {!collapsed && <p className="text-[10px] text-slate-400 text-center">FQuiz v0.1</p>}
            </div>
          </motion.div>
        </AnimatePresence>
      </aside>
    </SidebarContext.Provider>
  )
}