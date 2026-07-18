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
interface SContext { open: boolean; toggle: () => void; setOpen: (val: boolean) => void }
const SidebarContext = createContext<SContext>({ open: false, toggle: () => {}, setOpen: () => {} })
export const useSidebar = () => useContext(SidebarContext)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen((prev) => !prev)

  return (
    <SidebarContext.Provider value={{ open, toggle, setOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}

// ─── Data ────────────────────────────────────────────────────────
interface NavItem { label: string; href: string; icon: React.ComponentType<{ className?: string }>; soon?: boolean }
interface Section { id: string; title: string; items: NavItem[] }

const sections: Section[] = [
  {
    id: 'english', title: 'HỌC NGÔN NGỮ (AI)',
    items: [
      { label: 'Lộ trình bài học', href: '/roadmap', icon: Map },
      { label: 'Ôn tập Flashcards', href: '/flashcards', icon: Layers },
      { label: 'Phân tích tiến độ', href: '/analytics', icon: TrendingUp },
      { label: 'Trợ lý AI', href: '/ai', icon: Bot },
    ],
  },
  {
    id: 'quiz', title: 'ÔN THI TRẮC NGHIỆM',
    items: [
      { label: 'Bảng điều khiển', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Bộ đề của tôi', href: '/my-quizzes', icon: FileText },
      { label: 'Lịch sử làm bài', href: '/history', icon: History },
    ],
  },
]

// ─── Component ───────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname()
  const { open, setOpen } = useSidebar()

  const isActive = (item: NavItem) => {
    if (item.soon) return false
    if (item.href === '/my-quizzes') return pathname === '/my-quizzes' || pathname?.startsWith('/create')
    return pathname === item.href || pathname?.startsWith(item.href + '/')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs transition-opacity"
          />

          {/* Left Panel Drawer */}
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed left-4 top-24 bottom-8 z-50 w-[260px] bg-white/90 backdrop-blur-2xl border border-white/80 rounded-[28px] shadow-[0_16px_45px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#5D7B6F]">Menu FQuiz</span>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                title="Đóng panel"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6 scrollbar-thin">
              {sections.map((sec) => (
                <div key={sec.id}>
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-3 px-2">
                    {sec.title}
                  </p>
                  <div className="space-y-1">
                    {sec.items.map((item) => {
                      const active = isActive(item)
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.href + item.label}
                          href={item.soon ? '#' : item.href}
                          prefetch={false}
                          onClick={(e) => {
                            if (item.soon) {
                              e.preventDefault()
                            } else {
                              setOpen(false)
                            }
                          }}
                          className={cn(
                            'relative flex items-center gap-3 px-3 py-2.5 rounded-[14px] transition-all duration-200 group',
                            item.soon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                            active ? 'bg-[#5D7B6F]/10 text-[#5D7B6F]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                          )}
                        >
                          {active && (
                            <motion.div
                              layoutId="sidebar-active"
                              className="absolute inset-0 bg-[#5D7B6F]/10 rounded-[14px]"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <Icon className={cn('w-5 h-5 flex-shrink-0 relative z-10', active ? 'text-[#5D7B6F]' : 'text-slate-400 group-hover:text-slate-600')} />
                          <span className="text-sm font-semibold whitespace-nowrap overflow-hidden relative z-10">
                            {item.label}
                            {item.soon && (
                              <span className="ml-1.5 text-[10px] font-medium text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                Soon
                              </span>
                            )}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="px-4 pb-4 pt-2 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">FQuiz Multi-Service v1.0</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}