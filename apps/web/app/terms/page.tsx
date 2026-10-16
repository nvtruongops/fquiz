import type { Metadata } from 'next'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { GsapStaggerContainer } from '@/components/shared/gsap/GsapStaggerContainer'
import { TERMS_SECTIONS, TERMS_INTRODUCTION } from '@/lib/constants/legal-content'
import { LegalTableOfContents } from '@/components/legal/LegalTableOfContents'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Terms of Service — FQuiz',
  description: 'Terms of Service and regulations for using FQuiz.',
  openGraph: { title: 'Terms of Service — FQuiz', description: 'Terms of Service and regulations for using FQuiz.', type: 'website' },
}

export default async function TermsPage() {
  const user = await verifySession()

  return (
    <AppLayout user={user ? { _id: user.userId, name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}>
      <main className="max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 md:px-8 space-y-6">
        <GsapStaggerContainer selector=".legal-section" stagger={0.08} y={16} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <LegalTableOfContents type="terms" />

          <div className="lg:col-span-8 space-y-6">
            <div className="legal-section bg-primary/10 border border-primary/20 p-6 rounded-3xl space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-primary">Introduction</p>
              <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">{TERMS_INTRODUCTION}</p>
            </div>

            {TERMS_SECTIONS.map((sec) => (
              <section key={sec.id} id={sec.id} className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${sec.iconBgClass ?? 'bg-primary/10'} ${sec.iconColorClass ?? 'text-primary'} flex items-center justify-center shrink-0 border ${sec.iconBorderClass ?? 'border-primary/20'}`}>
                    <sec.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sec.iconColorClass ?? 'text-primary'}`}>{sec.number}</span>
                    <h2 className="text-lg sm:text-xl font-black text-foreground">{sec.title}</h2>
                  </div>
                </div>
                {sec.items ? (
                  <ul className="list-disc pl-6 space-y-2.5 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                    {sec.items.map((item, idx) => (<li key={idx}>{item}</li>))}
                  </ul>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">{sec.paragraph}</p>
                )}
              </section>
            ))}
          </div>
        </GsapStaggerContainer>
      </main>
    </AppLayout>
  )
}
