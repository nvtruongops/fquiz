'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/core/utils/cn'
import {
  ChevronLeft, ChevronRight, Home, LogIn, User, UserPlus, Lock
} from 'lucide-react'
import { UserDropdown } from '@/components/layout/UserDropdown'
import { NAV_SECTIONS, NavItem } from '@/lib/core/constants/navigation'
import { useAuthPrompt } from '@/store/shared/auth-prompt-store'

const navSections = NAV_SECTIONS

// ─── Context ─────────────────────────────────────────────────────
interface SidebarContextType {
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
}

const SidebarContext = createContext<SidebarContextType>({
  mobileOpen: false,
  setMobileOpen: () => {},
  collapsed: false,
  setCollapsed: () => {},
  toggleCollapsed: () => {},
})

export const useSidebar = () => useContext(SidebarContext)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('fquiz_sidebar_collapsed')
    if (saved !== null) {
      setCollapsed(saved === 'true')
    }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('fquiz_sidebar_collapsed', String(next))
      return next
    })
  }

  return (
    <SidebarContext.Provider
      value={{
        mobileOpen,
        setMobileOpen,
        collapsed,
        setCollapsed,
        toggleCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

interface SidebarProps {
  user?: { _id?: string; name: string; role: string; avatarUrl?: string } | null
}

type SidebarNavSection = (typeof navSections)[number]

function isNavItemActive(item: NavItem, pathname: string | null) {
  return pathname === item.href || isCourseBrowsePath(item, pathname) || isNestedNavPath(item, pathname)
}

function isCourseBrowsePath(item: NavItem, pathname: string | null) {
  return item.href === '/explore' && Boolean(pathname?.startsWith('/courses'))
}

function isNestedNavPath(item: NavItem, pathname: string | null) {
  return item.href !== '/dashboard' && Boolean(pathname?.startsWith(item.href + '/'))
}

function getSidebarItemClassName(active: boolean, compact: boolean, mobile: boolean) {
  const layout = compact
    ? 'w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all duration-150 group cursor-pointer my-0.5 relative'
    : mobile
      ? 'flex items-center justify-between px-3.5 h-11 rounded-xl text-xs font-bold transition-all'
      : 'flex items-center justify-between h-10 px-3 rounded-xl transition-all duration-150 group text-xs font-bold cursor-pointer'
  const state = active
    ? 'bg-primary text-primary-foreground shadow-xs'
    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
  return cn(layout, state)
}

function getSidebarItemTitle(compact: boolean, label: string, locked: boolean) {
  return compact ? label + (locked ? ' (Sign in required)' : '') : undefined
}

function getSidebarIconClassName(active: boolean, mobile: boolean) {
  return cn(
    'w-4.5 h-4.5 flex-shrink-0',
    !mobile && 'transition-colors',
    active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground',
  )
}

function SidebarItemLabel({ compact, mobile, label }: { compact: boolean; mobile: boolean; label: string }) {
  if (compact) return null
  return (
    <span className={cn('text-xs font-bold truncate', mobile ? '' : 'whitespace-nowrap overflow-hidden tracking-tight')}>
      {label}
    </span>
  )
}

function SidebarGuestLock({ locked, compact }: { locked: boolean; compact: boolean }) {
  if (!locked) return null
  if (compact) return <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary/80" />
  return <Lock className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0 ml-1.5" />
}

function SidebarSectionHeading({ title, collapsed, compact }: { title: string; collapsed: boolean; compact: boolean }) {
  return (
    <>
      {!collapsed && (
        <div className="px-3 pt-2 pb-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 select-none">{title}</p>
        </div>
      )}
      {compact && <div className="w-8 h-px bg-border mx-auto my-1.5 opacity-60" />}
    </>
  )
}

function SidebarSectionItem({
  item,
  user,
  pathname,
  compact,
  mobile,
  onItemClick,
}: {
  item: NavItem
  user: SidebarProps['user']
  pathname: string | null
  compact: boolean
  mobile: boolean
  onItemClick: (event: React.MouseEvent, item: NavItem) => void
}) {
  const active = isNavItemActive(item, pathname)
  const locked = !user && item.requiresAuth
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      prefetch={false}
      aria-current={active ? 'page' : undefined}
      title={getSidebarItemTitle(compact, item.label, Boolean(locked))}
      onClick={(event) => onItemClick(event, item)}
      className={getSidebarItemClassName(active, compact, mobile)}
    >
      <div className={cn('flex items-center min-w-0', compact ? '' : 'gap-3')}>
        <Icon className={getSidebarIconClassName(active, mobile)} />
        <SidebarItemLabel compact={compact} mobile={mobile} label={item.label} />
      </div>
      <SidebarGuestLock locked={Boolean(locked)} compact={compact} />
    </Link>
  )
}

function getSidebarSectionItemsClassName(compact: boolean) {
  return compact ? 'space-y-1' : 'space-y-0.5'
}

function SidebarSectionView({
  section,
  user,
  pathname,
  collapsed = false,
  mobile = false,
  onItemClick,
}: {
  section: SidebarNavSection
  user: SidebarProps['user']
  pathname: string | null
  collapsed?: boolean
  mobile?: boolean
  onItemClick: (event: React.MouseEvent, item: NavItem) => void
}) {
  const compact = collapsed && !mobile

  return (
    <div className="space-y-1">
      <SidebarSectionHeading title={section.title} collapsed={collapsed} compact={compact} />
      <div className={getSidebarSectionItemsClassName(compact)}>
        {section.items.map((item) => (
          <SidebarSectionItem key={item.href + item.label} item={item} user={user} pathname={pathname} compact={compact} mobile={mobile} onItemClick={onItemClick} />
        ))}
      </div>
    </div>
  )
}

type SidebarUser = SidebarProps['user']
type ProtectedNavClick = (event: React.MouseEvent, item: NavItem) => void

function getDashboardHref(user: SidebarUser) {
  return user ? '/dashboard' : '/'
}

function getDashboardLabel(user: SidebarUser) {
  return user ? 'Dashboard' : 'Home'
}

function getDashboardCurrentPage(active: boolean) {
  return active ? 'page' as const : undefined
}

function isCompactSidebar(collapsed: boolean, mobile: boolean) {
  return collapsed && !mobile
}

function isDashboardActive(user: SidebarUser, pathname: string | null) {
  return pathname === '/dashboard' || (pathname === '/' && !user)
}

function getDashboardClassName(active: boolean, collapsed: boolean, mobile: boolean) {
  const layout = mobile
    ? 'flex items-center gap-3 px-3.5 h-11 rounded-xl text-xs font-bold transition-all'
    : cn(
        'flex items-center transition-all duration-150 group text-xs font-bold cursor-pointer rounded-xl h-10',
        collapsed ? 'justify-center p-2' : 'px-3 gap-3',
      )
  return cn(layout, active ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-muted/70')
}

function getDashboardIconClassName(active: boolean, mobile: boolean) {
  const color = active ? 'text-primary-foreground' : mobile ? 'text-muted-foreground' : 'text-muted-foreground group-hover:text-foreground'
  return cn('w-4.5 h-4.5', !mobile && 'flex-shrink-0 transition-colors', color)
}

function SidebarDashboardLink({
  user,
  pathname,
  collapsed = false,
  mobile = false,
  onClick,
}: {
  user: SidebarUser
  pathname: string | null
  collapsed?: boolean
  mobile?: boolean
  onClick?: () => void
}) {
  const active = isDashboardActive(user, pathname)
  const compact = isCompactSidebar(collapsed, mobile)
  const label = getDashboardLabel(user)
  return (
    <Link
      href={getDashboardHref(user)}
      prefetch={false}
      aria-current={getDashboardCurrentPage(active)}
      title={label}
      onClick={onClick}
      className={getDashboardClassName(active, collapsed, mobile)}
    >
      <Home className={getDashboardIconClassName(active, mobile)} />
      <SidebarItemLabel compact={compact} mobile={mobile} label={label} />
    </Link>
  )
}

function SidebarBrandHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('h-16 flex items-center border-b border-border flex-shrink-0 transition-all', collapsed ? 'justify-center px-2' : 'px-6')}>
      <Link href="/" prefetch={false} data-desktop-nav-home="true" className="flex items-center gap-2 group overflow-hidden">
        {collapsed ? (
          <span className="text-xl font-black text-primary">F</span>
        ) : (
          <div className="flex items-baseline gap-2 whitespace-nowrap overflow-hidden">
            <span className="text-xl font-black tracking-tight text-foreground leading-none group-hover:text-primary transition-colors">FQuiz</span>
            <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-md border border-primary/20 leading-none">Platform</span>
          </div>
        )}
      </Link>
    </div>
  )
}

function SidebarSectionList({
  sections,
  user,
  pathname,
  collapsed = false,
  mobile = false,
  onItemClick,
}: {
  sections: SidebarNavSection[]
  user: SidebarUser
  pathname: string | null
  collapsed?: boolean
  mobile?: boolean
  onItemClick: ProtectedNavClick
}) {
  return sections.map((section) => (
    <SidebarSectionView
      key={section.id}
      section={section}
      user={user}
      pathname={pathname}
      collapsed={collapsed}
      mobile={mobile}
      onItemClick={onItemClick}
    />
  ))
}

function CompactSidebarFooter({ user, toggleCollapsed }: { user: SidebarUser; toggleCollapsed: () => void }) {
  return (
    <div className="w-full flex flex-col items-center gap-2">
      {user ? (
        <UserDropdown user={user} compact={true} />
      ) : (
        <Link
          href="/login"
          prefetch={false}
          className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
          title="Sign in / Sign up"
        >
          <LogIn className="w-4 h-4" />
        </Link>
      )}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label="Expand sidebar"
        aria-expanded={false}
        className="w-8 h-8 rounded-xl bg-card border border-border shadow-2xs flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-all cursor-pointer"
        title="Expand sidebar"
      >
        <ChevronRight aria-hidden="true" className="w-4 h-4" />
      </button>
    </div>
  )
}

function ExpandedSidebarFooter({ user, toggleCollapsed }: { user: SidebarUser; toggleCollapsed: () => void }) {
  return (
    <div className="w-full space-y-2">
      {user ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0"><UserDropdown user={user} fullCard={true} /></div>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            aria-expanded={true}
            className="w-7 h-7 rounded-lg bg-card border border-border/80 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-all cursor-pointer shrink-0"
            title="Collapse sidebar"
          >
            <ChevronLeft aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-card border border-border shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0"><User className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-foreground truncate">FQuiz Guest</p>
                <p className="text-[10px] font-semibold text-muted-foreground truncate">Not signed in</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              aria-expanded={true}
              className="w-6 h-6 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-all cursor-pointer shrink-0"
              title="Collapse sidebar"
            >
              <ChevronLeft aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <Link href="/login" prefetch={false} className="flex items-center justify-center gap-1 h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-black shadow-xs transition-all cursor-pointer">
              <LogIn className="w-3 h-3" /><span>Sign in</span>
            </Link>
            <Link href="/register" prefetch={false} className="flex items-center justify-center gap-1 h-8 rounded-xl border border-border bg-muted/50 hover:bg-muted text-foreground text-[11px] font-bold transition-all cursor-pointer">
              <UserPlus className="w-3 h-3 text-primary" /><span>Sign up</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarDesktopFooter({ user, collapsed, toggleCollapsed }: { user: SidebarUser; collapsed: boolean; toggleCollapsed: () => void }) {
  return (
    <div className="p-3 border-t border-border flex-shrink-0 bg-muted/20 overflow-hidden">
      {collapsed
        ? <CompactSidebarFooter user={user} toggleCollapsed={toggleCollapsed} />
        : <ExpandedSidebarFooter user={user} toggleCollapsed={toggleCollapsed} />}
    </div>
  )
}

function SidebarDesktop({
  user,
  pathname,
  sections,
  collapsed,
  toggleCollapsed,
  onItemClick,
}: {
  user: SidebarUser
  pathname: string | null
  sections: SidebarNavSection[]
  collapsed: boolean
  toggleCollapsed: () => void
  onItemClick: ProtectedNavClick
}) {
  return (
    <aside className={cn('hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-card/95 backdrop-blur-md border-r border-border shadow-xs overflow-hidden transition-sidebar-width duration-300 ease-in-out', collapsed ? 'w-sidebar-collapsed' : 'w-sidebar-expanded')}>
      <SidebarBrandHeader collapsed={collapsed} />
      <nav className={cn('flex-1 overflow-y-auto py-3 space-y-4 custom-scrollbar', collapsed ? 'px-2' : 'px-3')}>
        <SidebarDashboardLink user={user} pathname={pathname} collapsed={collapsed} />
        <SidebarSectionList sections={sections} user={user} pathname={pathname} collapsed={collapsed} onItemClick={onItemClick} />
      </nav>
      <SidebarDesktopFooter user={user} collapsed={collapsed} toggleCollapsed={toggleCollapsed} />
    </aside>
  )
}

function MobileDrawerHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border">
      <div className="flex items-center gap-2"><span className="font-black text-foreground text-base">FQuiz Menu</span></div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 cursor-pointer"
      >
        <ChevronLeft aria-hidden="true" className="w-5 h-5" />
      </button>
    </div>
  )
}

function MobileDrawerFooter({ user, onClose }: { user: SidebarUser; onClose: () => void }) {
  return (
    <div className="p-4 border-t border-border bg-muted/40">
      {user ? (
        <UserDropdown user={user} fullCard={true} />
      ) : (
        <div className="space-y-2">
          <div className="text-center pb-1">
            <p className="text-xs font-black text-foreground">You are not signed in</p>
            <p className="text-[10px] text-muted-foreground font-medium">Sign in to save your practice progress</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/login" prefetch={false} onClick={onClose} className="flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground px-3 py-2.5 rounded-xl shadow-xs text-center">Sign in</Link>
            <Link href="/register" prefetch={false} onClick={onClose} className="flex items-center justify-center text-xs font-bold bg-card text-foreground border border-border px-3 py-2.5 rounded-xl shadow-xs text-center">Sign up</Link>
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarMobile({
  user,
  pathname,
  sections,
  open,
  setOpen,
  onItemClick,
}: {
  user: SidebarUser
  pathname: string | null
  sections: SidebarNavSection[]
  open: boolean
  setOpen: (open: boolean) => void
  onItemClick: ProtectedNavClick
}) {
  const close = () => setOpen(false)
  return (
    <>
      <div onClick={close} className={cn('fixed inset-0 z-50 bg-background/80 backdrop-blur-xs lg:hidden transition-opacity duration-300', open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')} />
      <aside className={cn('fixed left-0 top-0 bottom-0 z-50 w-mobile-drawer bg-card border-r border-border flex flex-col overflow-hidden lg:hidden shadow-2xl transition-transform duration-300 ease-in-out', open ? 'translate-x-0' : '-translate-x-full')}>
        <MobileDrawerHeader onClose={close} />
        <nav className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <SidebarDashboardLink user={user} pathname={pathname} mobile onClick={close} />
          <SidebarSectionList sections={sections} user={user} pathname={pathname} mobile onItemClick={onItemClick} />
        </nav>
        <MobileDrawerFooter user={user} onClose={close} />
      </aside>
    </>
  )
}

function useProtectedNavClick(user: SidebarUser, mobileOpen: boolean, setMobileOpen: (open: boolean) => void): ProtectedNavClick {
  const { openAuthPrompt } = useAuthPrompt()
  return (event, item) => {
    if (user || !item.requiresAuth) return
    event.preventDefault()
    openAuthPrompt({ featureName: item.label, description: item.description, targetUrl: item.href })
    if (mobileOpen) setMobileOpen(false)
  }
}

function getVisibleNavSections(user: SidebarUser): SidebarNavSection[] {
  if (user?.role !== 'teacher') return navSections
  return navSections.filter((section) => section.id !== 'classroom-section')
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const { mobileOpen, setMobileOpen, collapsed, toggleCollapsed } = useSidebar()
  const sections = getVisibleNavSections(user)
  const onItemClick = useProtectedNavClick(user, mobileOpen, setMobileOpen)

  return (
    <>
      <SidebarDesktop
        user={user}
        pathname={pathname}
        sections={sections}
        collapsed={collapsed}
        toggleCollapsed={toggleCollapsed}
        onItemClick={onItemClick}
      />
      <SidebarMobile
        user={user}
        pathname={pathname}
        sections={sections}
        open={mobileOpen}
        setOpen={setMobileOpen}
        onItemClick={onItemClick}
      />
    </>
  )
}
