import type { Metadata } from 'next'
import Link from 'next/link'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { ArrowLeft, ShieldCheck, Lock, Cookie, UserCheck, FileText, ChevronRight } from 'lucide-react'
import { GsapStaggerContainer } from '@/components/shared/gsap/GsapStaggerContainer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Privacy Policy — FQuiz',
  description: 'Privacy policy and personal data protection commitments on FQuiz.',
  openGraph: {
    title: 'Privacy Policy — FQuiz',
    description: 'Privacy policy and personal data protection commitments on FQuiz.',
    type: 'website',
  },
}

export default async function PrivacyPage() {
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
              Legal & Privacy
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
                  Privacy Policy
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
                  href="#minimization"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>1. Data Minimization</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="#security"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-success-fg" />
                    <span>2. Password Security</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="#cookies"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Cookie className="w-4 h-4 text-warning-fg" />
                    <span>3. Cookies & Sessions</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="#rights"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <span>4. User Rights</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>
              </nav>

              <hr className="border-border" />

              {/* Quick Link to Terms */}
              <div className="bg-muted p-4 rounded-2xl border border-border space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground">Looking for Terms of Service?</p>
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:underline"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Terms of Service</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* Right Column: Detailed Document Stream */}
          <div className="lg:col-span-8 space-y-6">
            <div className="legal-section bg-primary/10 border border-primary/20 p-6 rounded-3xl space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-primary">Commitment Summary</p>
              <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">
                FQuiz is committed to protecting your privacy and personal data. Please read the sections below to understand how we collect, store, and safeguard your information.
              </p>
            </div>

            {/* Section 1 */}
            <section id="minimization" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Section 01</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Data Minimization</h2>
                </div>
              </div>
              <ul className="list-disc pl-6 space-y-2.5 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                <li>We collect only essential information required to operate the platform: <strong>Username</strong>, <strong>Email address</strong>, and <strong>Quiz history & results</strong>.</li>
                <li>We never collect sensitive personal identifiers, precise geographic locations, or unnecessary device data.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section id="security" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Section 02</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Password Security</h2>
                </div>
              </div>
              <ul className="list-disc pl-6 space-y-2.5 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                <li>Your password is cryptographically hashed using industry-standard one-way algorithms before database persistence.</li>
                <li><strong>No one</strong> (including FQuiz administrators and engineers) can access or view your plaintext password.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="cookies" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <Cookie className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Section 03</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Cookies & Sessions</h2>
                </div>
              </div>
              <ul className="list-disc pl-6 space-y-2.5 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                <li>FQuiz uses secure authentication tokens (JWT) stored in HTTP-only cookies to manage your active session.</li>
                <li>These cookies are strictly used for security and authentication purposes, with zero third-party ad tracking.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section id="rights" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Section 04</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">User Rights & Data Control</h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                You have the right to request an export of your quiz history or permanently delete your account at any time. Upon deletion, all associated quiz records and personal data are purged completely from our database.
              </p>
            </section>
          </div>
        </GsapStaggerContainer>
      </main>
    </AppLayout>
  )
}
