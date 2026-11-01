'use client'

import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { Footer } from '@/components/layout/Footer'
import { Compass, BookCheck, Layers, GraduationCap, ArrowRight } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { useTranslations } from '@fquiz/ui/i18n'

interface LandingHomeClientProps {
  user: { name: string; role: string; avatarUrl?: string } | null
}

export function LandingHomeClient({ user }: LandingHomeClientProps) {
  const t = useTranslations()

  return (
    <AppLayout user={user}>
      <div className="absolute inset-x-0 top-0 h-[360px] w-full overflow-hidden -z-10 pointer-events-none flex justify-center">
        <div className="w-full max-w-6xl h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/12 via-primary/3 to-transparent opacity-60" />
      </div>

      <div className="-my-4 -mx-3 sm:-mx-8 flex-1 flex flex-col justify-between min-h-[calc(100dvh-5rem)] lg:min-h-[calc(100dvh-2rem)]">
        <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 my-auto flex-1 flex flex-col justify-center space-y-6 sm:space-y-8 animate-in fade-in-50 duration-300">
          <div className="space-y-6 sm:space-y-8">
            <section className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-5">
              <div className="hero-stagger inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border shadow-2xs backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-black text-foreground uppercase tracking-wider">{t('landing.badge')}</span>
              </div>

              <h1 className="hero-stagger text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.25] text-foreground">
                <span className="block mb-1 sm:mb-1.5">{t('landing.titleLineOne')}</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/90 to-primary-hover block">
                  {t('landing.titleLineTwo')}
                </span>
              </h1>

              <p className="hero-stagger text-xs sm:text-sm md:text-base text-muted-foreground max-w-xl mx-auto font-medium leading-relaxed">
                {t('landing.description')}
              </p>

              <div className="hero-stagger flex flex-wrap items-center justify-center gap-3 pt-1">
                <Button asChild size="lg" className="rounded-xl px-6 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm shadow-md shadow-primary/20 transition-all cursor-pointer">
                  <Link href="/explore">
                    <Compass className="w-4 h-4 mr-2" />
                    {t('landing.explore')}
                  </Link>
                </Button>

                <Button asChild size="lg" variant="outline" className="rounded-xl px-6 h-11 border-2 border-border bg-card hover:bg-muted font-bold text-sm text-foreground transition-all cursor-pointer">
                  <Link href={user ? '/dashboard' : '/login'}>
                    {user ? t('landing.goDashboard') : t('landing.signIn')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </section>

            <section className="hero-stagger grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 pt-4 text-left">
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-2 hover:border-primary/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><BookCheck className="w-4.5 h-4.5" /></div>
                <h3 className="text-sm font-black text-foreground">{t('landing.repositoryTitle')}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">{t('landing.repositoryDescription')}</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-2 hover:border-primary/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Layers className="w-4.5 h-4.5" /></div>
                <h3 className="text-sm font-black text-foreground">{t('landing.flashcardsTitle')}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">{t('landing.flashcardsDescription')}</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-2 hover:border-primary/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><GraduationCap className="w-4.5 h-4.5" /></div>
                <h3 className="text-sm font-black text-foreground">{t('landing.classroomsTitle')}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">{t('landing.classroomsDescription')}</p>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </AppLayout>
  )
}
