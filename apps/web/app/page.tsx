import type { Metadata } from 'next'
import Link from 'next/link'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { Footer } from '@/components/layout/Footer'
import { Compass, BookCheck, Layers, GraduationCap, ArrowRight } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { GsapStaggerContainer } from '@/components/shared/gsap/GsapStaggerContainer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'FQuiz — Nền tảng Ôn thi Trắc nghiệm & Lớp học Trực tuyến',
  description: 'Nền tảng thi thử trắc nghiệm, ôn tập flashcard và quản lý lớp học trực tuyến.',
}

export default async function HomePage() {
  const user = await verifySession()

  return (
    <AppLayout
      user={user ? { name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}
    >
      {/* Background Soft Glow */}
      <div className="absolute inset-x-0 top-0 h-[500px] w-full overflow-hidden -z-10 pointer-events-none flex justify-center transform-gpu">
        <div className="w-full max-w-7xl h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-primary/5 to-transparent blur-3xl opacity-70 transform-gpu" />
      </div>

      <div className="-my-4 -mx-3 sm:-mx-8 flex-1 flex flex-col justify-between min-h-[calc(100dvh-5rem)] lg:min-h-[calc(100dvh-2rem)]">
        {/* Main Content */}
        <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 my-auto flex-1 flex flex-col justify-center space-y-6 sm:space-y-8">
          <GsapStaggerContainer selector=".hero-stagger" stagger={0.08} y={16}>
            {/* Hero Section */}
            <section className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-5">
              {/* Badge */}
              <div className="hero-stagger inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border shadow-2xs backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-black text-foreground uppercase tracking-wider">
                  Nền tảng Ôn thi Trắc nghiệm & Lớp học
                </span>
              </div>

              {/* Title */}
              <h1 className="hero-stagger text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.25] text-foreground">
                <span className="block mb-1 sm:mb-1.5">Luyện thi Trắc nghiệm &</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/90 to-primary-hover block">
                  Quản lý Lớp học Thông minh
                </span>
              </h1>

              {/* Description */}
              <p className="hero-stagger text-xs sm:text-sm md:text-base text-muted-foreground max-w-xl mx-auto font-medium leading-relaxed">
                Thi thử trắc nghiệm đa dạng môn học, hỗ trợ trộn đề ngẫu nhiên, thẻ ghi nhớ flashcard và nộp bài tập trực tuyến chuyên nghiệp.
              </p>

              {/* CTA Buttons */}
              <div className="hero-stagger flex flex-wrap items-center justify-center gap-3 pt-1">
                <Button asChild size="lg" className="rounded-xl px-6 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm shadow-md shadow-primary/20 transition-all cursor-pointer">
                  <Link href="/explore">
                    <Compass className="w-4 h-4 mr-2" />
                    Khám phá Đề thi
                  </Link>
                </Button>

                <Button asChild size="lg" variant="outline" className="rounded-xl px-6 h-11 border-2 border-border bg-card hover:bg-muted font-bold text-sm text-foreground transition-all cursor-pointer">
                  <Link href={user ? '/dashboard' : '/login'}>
                    {user ? 'Vào Bảng điều khiển' : 'Đăng nhập ngay'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </section>

            {/* 3 Clean Feature Highlights */}
            <section className="hero-stagger grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 pt-4 text-left">
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-2 hover:border-primary/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <BookCheck className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm font-black text-foreground">Kho Đề Thi Phong Phú</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Trắc nghiệm chuẩn kiến thức nhiều môn, làm bài có bấm giờ và xem đáp án giải thích chi tiết.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-2 hover:border-primary/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Layers className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm font-black text-foreground">Thẻ Ghi Nhớ Flashcard</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Lật thẻ flashcard ghi nhớ các khái niệm cốt lõi, công thức và câu hỏi trọng tâm trước kỳ thi.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-2 hover:border-primary/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <GraduationCap className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm font-black text-foreground">Lớp Học & Giảng Dạy</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Tham gia lớp học của giáo viên, làm bài tập được giao và theo dõi kết quả minh bạch.
                </p>
              </div>
            </section>
          </GsapStaggerContainer>
        </main>

        {/* Landing Page Full-Width Footer */}
        <Footer />
      </div>
    </AppLayout>
  )
}
