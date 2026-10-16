'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, ChevronDown, ListFilter, Shield, FileText, ArrowLeft, type LucideIcon } from 'lucide-react'
import { TERMS_SECTIONS, PRIVACY_SECTIONS, type LegalSection } from '@/lib/constants/legal-content'

interface LegalTableOfContentsProps {
  type?: 'terms' | 'privacy'
  title?: string
  lastUpdated?: string
  sections?: LegalSection[]
  alternateLink?: {
    href: string
    prompt: string
    label: string
    icon: LucideIcon
  }
}

export function LegalTableOfContents({
  type = 'terms',
  title: propTitle,
  lastUpdated: propLastUpdated,
  sections: propSections,
  alternateLink: propAlternateLink,
}: LegalTableOfContentsProps) {
  const isTerms = type === 'terms'
  const title = propTitle ?? (isTerms ? 'Terms of Service' : 'Privacy Policy')
  const lastUpdated = propLastUpdated ?? 'Last updated: April 2026'
  const sections = propSections ?? (isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS)
  const alternateLink =
    propAlternateLink ??
    (isTerms
      ? {
          href: '/privacy',
          prompt: 'Looking for Privacy Policy?',
          label: 'View Privacy Policy',
          icon: Shield,
        }
      : {
          href: '/terms',
          prompt: 'Looking for Terms of Service?',
          label: 'View Terms of Service',
          icon: FileText,
        })

  const badgeText = isTerms ? 'Rules & Legal' : 'Legal & Privacy'
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '')
  const [mobileExpanded, setMobileExpanded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find visible entries
        const visibleEntries = entries.filter((entry) => entry.isIntersecting)
        if (visibleEntries.length > 0) {
          // Sort by bounding client top to pick the highest in view
          const topEntry = visibleEntries.reduce((prev, current) => {
            return current.boundingClientRect.top < prev.boundingClientRect.top ? current : prev
          })
          setActiveId(topEntry.target.id)
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: [0, 0.2, 0.5],
      }
    )

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [sections])

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    setActiveId(id)
    setMobileExpanded(false)

    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.pushState(null, '', `#${id}`)
    }
  }

  const activeSection = sections.find((s) => s.id === activeId) ?? sections[0]

  return (
    <aside className="lg:col-span-4 lg:sticky lg:top-8 space-y-4">
      {/* Mobile Sticky Quick-Jump Bar */}
      <div className="lg:hidden sticky top-2 z-20 bg-card/95 backdrop-blur-md border border-border rounded-2xl p-3 shadow-md space-y-2">
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-primary/90 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Home</span>
          </Link>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {badgeText}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-card-foreground hover:bg-muted/80 transition-colors"
          aria-expanded={mobileExpanded}
          aria-label="Toggle Table of Contents"
        >
          <div className="flex items-center gap-2 truncate">
            <ListFilter className="w-4 h-4 text-primary shrink-0" />
            <span className="text-[11px] text-muted-foreground uppercase font-black tracking-wider shrink-0">Jump to:</span>
            <span className="truncate text-foreground font-extrabold">{activeSection?.shortTitle}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
              mobileExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {mobileExpanded && (
          <nav className="pt-2 border-t border-border space-y-1">
            {sections.map((sec) => {
              const isActive = sec.id === activeId
              return (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={(e) => scrollToSection(e, sec.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/20 shadow-2xs'
                      : 'text-card-foreground hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <sec.icon className={`w-4 h-4 ${sec.iconColorClass ?? 'text-primary'}`} />
                    <span>{sec.shortTitle}</span>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 ${
                      isActive ? 'text-primary translate-x-0.5' : 'text-muted-foreground'
                    }`}
                  />
                </a>
              )
            })}
          </nav>
        )}
      </div>

      {/* Desktop Sticky Sidebar with Scroll-Guard */}
      <div className="hidden lg:block bg-card backdrop-blur-md border border-border rounded-3xl p-6 shadow-2xs space-y-5 max-h-[calc(100vh-5rem)] overflow-y-auto">
        {/* Back Button & Category Badge Integrated into Top of Left Card */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:text-primary/90 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Home</span>
          </Link>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {badgeText}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-black tracking-widest text-primary uppercase">Legal Center</p>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{title}</h1>
          <p className="text-xs font-medium text-muted-foreground pt-1">{lastUpdated}</p>
        </div>

        <hr className="border-border" />

        <nav className="space-y-1.5" aria-label="Table of Contents">
          <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mb-2">Table of Contents</p>
          {sections.map((sec) => {
            const isActive = sec.id === activeId
            return (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={(e) => scrollToSection(e, sec.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all group ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/25 shadow-2xs font-black'
                    : 'text-card-foreground hover:bg-primary/10 hover:text-primary border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <sec.icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-primary' : sec.iconColorClass ?? 'text-muted-foreground'
                    }`}
                  />
                  <span>{sec.shortTitle}</span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${
                    isActive
                      ? 'text-primary translate-x-1 font-black'
                      : 'text-muted-foreground group-hover:translate-x-0.5'
                  }`}
                />
              </a>
            )
          })}
        </nav>

        {alternateLink && (
          <>
            <hr className="border-border" />
            <div className="bg-muted p-4 rounded-2xl border border-border space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground">{alternateLink.prompt}</p>
              <Link
                href={alternateLink.href}
                className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:underline"
              >
                <alternateLink.icon className="w-3.5 h-3.5" />
                <span>{alternateLink.label}</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
