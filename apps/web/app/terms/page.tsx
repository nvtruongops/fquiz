import type { Metadata } from 'next'
import Link from 'next/link'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { ArrowLeft, ShieldCheck, Copyright, AlertTriangle, RefreshCw, Shield, ChevronRight } from 'lucide-react'
import { GsapStaggerContainer } from '@/components/shared/gsap/GsapStaggerContainer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Terms of Service — FQuiz',
  description: 'Terms of Service and regulations for using FQuiz.',
  openGraph: {
    title: 'Terms of Service — FQuiz',
    description: 'Terms of Service and regulations for using FQuiz.',
    type: 'website',
  },
}

export default async function TermsPage() {
  const user = await verifySession()

  return (
    <AppLayout user={user ? { name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}>
      <main className="max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 md:px-8 space-y-6">
        {/* Top Back Navigation UX */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:text-primary/90 transition-colors group bg-card backdrop-blur-md px-4 py-2 rounded-full border border-border shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Home</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Rules & Legal
            </span>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <GsapStaggerContainer selector=".legal-section" stagger={0.08} y={16} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Sticky Sidebar / Table of Contents */}
          <aside className="legal-section lg:col-span-4 lg:sticky lg:top-24 space-y-5">
            <div className="bg-card backdrop-blur-md border border-border rounded-3xl p-6 shadow-2xs space-y-5">
              <div className="space-y-1">
                <p className="text-[10px] font-black tracking-widest text-primary uppercase">Legal Center</p>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  Terms of Service
                </h1>
                <p className="text-xs font-medium text-muted-foreground pt-1">
                  Last updated: April 2026
                </p>
              </div>

              <hr className="border-border" />

              {/* Table of Contents Navigation */}
              <nav className="space-y-1.5">
                <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mb-2">Table of Contents</p>
                <a
                  href="#account"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>1. Registration & Security</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="#copyright"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Copyright className="w-4 h-4 text-success-fg" />
                    <span>2. Intellectual Property</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="#disclaimer"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-warning-fg" />
                    <span>3. Disclaimer</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="#changes"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <RefreshCw className="w-4 h-4 text-primary" />
                    <span>4. Modifications</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>
              </nav>

              <hr className="border-border" />

              {/* Quick Link to Privacy */}
              <div className="bg-muted p-4 rounded-2xl border border-border space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground">Looking for Privacy Policy?</p>
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:underline"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>View Privacy Policy</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* Right Column: Detailed Document Stream */}
          <div className="lg:col-span-8 space-y-6">
            <div className="legal-section bg-primary/10 border border-primary/20 p-6 rounded-3xl space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-primary">Introduction</p>
              <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">
                Welcome to FQuiz. By accessing and using our platform, you agree to comply with and be bound by these Terms of Service. If you do not agree, please discontinue using the service immediately.
              </p>
            </div>

            {/* Section 1 */}
            <section id="account" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Section 01</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Account Registration & Security</h2>
                </div>
              </div>
              <ul className="list-disc pl-6 space-y-2.5 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                <li>You are responsible for maintaining the confidentiality of your login credentials (username and password).</li>
                <li>Do not share accounts. You are solely responsible for all activities and submissions conducted under your account.</li>
                <li>FQuiz reserves the right to suspend or terminate accounts engaging in fraudulent activities, abuse, or unauthorized exploitation.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section id="copyright" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Copyright className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Section 02</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Intellectual Property & Content</h2>
                </div>
              </div>
              <ul className="list-disc pl-6 space-y-2.5 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                <li>All quiz questions, learning materials, algorithms, and interface designs on FQuiz are the intellectual property of FQuiz.</li>
                <li>Unauthorized copying, distribution, automated scraping, or commercialization of content without prior written consent is strictly prohibited.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="disclaimer" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Section 03</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Educational Disclaimer</h2>
                </div>
              </div>
              <ul className="list-disc pl-6 space-y-2.5 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                <li>FQuiz is an educational technology platform providing simulated practice environments. We do not guarantee that practice questions will mirror actual official examinations.</li>
                <li>FQuiz is not responsible for academic standing or official test outcomes. Users must adhere to their educational institution&apos;s academic integrity policies.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section id="changes" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Section 04</span>
                  <h2 className="text-lg sm:text-xl font-black text-card-foreground">Modifications to Terms</h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                FQuiz reserves the right to update these Terms of Service at any time to reflect platform improvements or regulatory compliance. Continued use of the platform constitutes acceptance of revised terms.
              </p>
            </section>
          </div>
        </GsapStaggerContainer>
      </main>
    </AppLayout>
  )
}
