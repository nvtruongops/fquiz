import type { Metadata } from 'next'
import Link from 'next/link'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { Footer } from '@/components/layout/Footer'
import { Sparkles, Compass } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { GsapStaggerContainer } from '@/components/shared/gsap/GsapStaggerContainer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'FQuiz — Nền tảng Học Ngôn ngữ AI & Ôn thi Trắc nghiệm',
  description: 'Học tiếng Anh với AI, ôn tập Flashcard thuật toán FSRS và luyện thi trắc nghiệm chống gian lận.',
}

export default async function HomePage() {
  const user = await verifySession()

  return (
    <AppLayout user={user ? { name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}>
      {/* Background Mesh Glow */}
      <div className="absolute inset-x-0 top-0 h-[600px] w-full overflow-hidden -z-10 pointer-events-none flex justify-center transform-gpu">
        <div className="w-full max-w-7xl h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-primary/10 to-transparent blur-3xl opacity-60 transform-gpu" />
      </div>

      <div className="w-full pt-4 sm:pt-8 relative z-10 flex flex-col min-h-[calc(100vh-140px)] justify-between space-y-12">
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto space-y-8 px-4 my-auto pt-8 pb-12">
          <GsapStaggerContainer selector=".hero-stagger" stagger={0.1} y={18}>
            <div className="hero-stagger inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/80 border border-border shadow-2xs backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-extrabold text-primary uppercase tracking-widest">
                Nền tảng Học tập Thế hệ Mới 2026
              </span>
            </div>

            <h1 className="hero-stagger mt-6 text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1]">
              <span className="text-foreground">Ôn thi Trắc nghiệm </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/90 to-primary-hover">
                Thông minh
              </span>
            </h1>

            <div className="hero-stagger flex items-center justify-center gap-4 pt-6">
              <Button asChild size="lg" className="rounded-xl px-8 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-primary/20 transition-all hover:scale-105 cursor-pointer">
                <Link href="/explore">
                  <Compass className="w-5 h-5 mr-2" />
                  Khám phá Đề Thi
                </Link>
              </Button>
            </div>
          </GsapStaggerContainer>
        </section>

        {/* Landing Page Exclusive Footer */}
        <Footer />
      </div>
    </AppLayout>
  )
}
