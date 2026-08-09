import type { Metadata } from 'next'
import Link from 'next/link'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { ArrowLeft, ShieldCheck, Copyright, AlertTriangle, RefreshCw, Shield, ChevronRight } from 'lucide-react'
import { GsapStaggerContainer } from '@/components/shared/gsap/GsapStaggerContainer'

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng — FQuiz',
  description: 'Quy định và Điều khoản sử dụng dịch vụ ôn thi trắc nghiệm FQuiz.',
  openGraph: {
    title: 'Điều khoản sử dụng — FQuiz',
    description: 'Quy định và Điều khoản sử dụng dịch vụ ôn thi trắc nghiệm FQuiz.',
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
            <span>Quay lại trang chủ</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Quy định & Pháp lý
            </span>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <GsapStaggerContainer selector=".legal-section" stagger={0.08} y={16} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Sticky Sidebar / Table of Contents */}
          <aside className="legal-section lg:col-span-4 lg:sticky lg:top-24 space-y-5">
            <div className="bg-card backdrop-blur-md border border-border rounded-3xl p-6 shadow-2xs space-y-5">
              <div className="space-y-1">
                <p className="text-[10px] font-black tracking-widest text-primary uppercase">Trung tâm Pháp lý</p>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  Điều khoản sử dụng
                </h1>
                <p className="text-xs font-medium text-muted-foreground pt-1">
                  Cập nhật lần cuối: Tháng 4, 2026
                </p>
              </div>

              <hr className="border-border" />

              {/* Table of Contents Navigation */}
              <nav className="space-y-1.5">
                <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mb-2">Mục lục nhanh</p>
                <a
                  href="#account"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>1. Đăng ký & Bảo mật</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="#copyright"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Copyright className="w-4 h-4 text-success-fg" />
                    <span>2. Bản quyền nội dung</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="#disclaimer"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-warning-fg" />
                    <span>3. Miễn trừ trách nhiệm</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="#changes"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <RefreshCw className="w-4 h-4 text-primary" />
                    <span>4. Thay đổi điều khoản</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>
              </nav>

              <hr className="border-border" />

              {/* Quick Link to Privacy */}
              <div className="bg-muted p-4 rounded-2xl border border-border space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground">Bạn muốn xem Chính sách bảo mật?</p>
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:underline"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Xem Chính sách bảo mật</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* Right Column: Detailed Document Stream */}
          <div className="lg:col-span-8 space-y-6">
            <div className="legal-section bg-primary/10 border border-primary/20 p-6 rounded-3xl space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-primary">Lời ngỏ sử dụng</p>
              <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">
                Chào mừng bạn đến với FQuiz. Bằng việc truy cập và sử dụng nền tảng của chúng tôi, bạn đồng ý tuân thủ các quy định được nêu trong Điều khoản sử dụng này. Nếu không đồng ý, vui lòng dừng sử dụng dịch vụ.
              </p>
            </div>

            {/* Section 1 */}
            <section id="account" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Điều 01</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Đăng ký & Bảo mật tài khoản</h2>
                </div>
              </div>
              <ul className="list-disc pl-6 space-y-2.5 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                <li>Bạn có trách nhiệm tự bảo vệ thông tin đăng nhập cá nhân (Tên đăng nhập, Mật khẩu).</li>
                <li>Không chia sẻ hoặc sử dụng chung tài khoản với người khác. Mọi hoạt động phát sinh từ tài khoản của bạn sẽ do bạn hoàn toàn chịu trách nhiệm.</li>
                <li>FQuiz có quyền tạm khóa hoặc vô hiệu hóa tài khoản vĩnh viễn nếu phát hiện có hành vi gian lận, phá hoại hoặc sử dụng sai mục đích cấp phép.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section id="copyright" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Copyright className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Điều 02</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Bản quyền nội dung</h2>
                </div>
              </div>
              <ul className="list-disc pl-6 space-y-2.5 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                <li>Toàn bộ bộ câu hỏi, tài liệu ôn tập, thuật toán xử lý và giao diện hiển thị trên FQuiz thuộc quyền sở hữu trí tuệ của FQuiz.</li>
                <li>Nghiêm cấm mọi hành vi sao chép, phát tán, cào dữ liệu (scraping), hoặc thương mại hóa nội dung từ hệ thống khi chưa có sự cho phép bằng văn bản.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="disclaimer" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Điều 03</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Quy định học tập & Miễn trừ trách nhiệm</h2>
                </div>
              </div>
              <ul className="list-disc pl-6 space-y-2.5 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                <li>FQuiz là một nền tảng công nghệ giáo dục (EdTech) cung cấp môi trường luyện thi giả lập. Chúng tôi không đảm bảo các câu hỏi trên hệ thống sẽ xuất hiện chính xác trong các kỳ thi thực tế của bạn.</li>
                <li>FQuiz không chịu trách nhiệm đánh giá tư cách đạo đức hay kết quả học tập cuối cùng của bất kỳ cá nhân nào. Mọi nỗ lực gian lận trong thi cử thật thông qua ứng dụng công nghệ không thuộc phạm vi trách nhiệm của chúng tôi.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section id="changes" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Điều 04</span>
                  <h2 className="text-lg sm:text-xl font-black text-card-foreground">Thay đổi điều khoản</h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                FQuiz bảo lưu quyền cập nhật Điều khoản sử dụng bất cứ lúc nào để phù hợp với sự phát triển của hệ thống và tuân thủ pháp luật. Phiên bản mới sẽ có hiệu lực ngay khi được đăng tải trên trang này.
              </p>
            </section>
          </div>
        </GsapStaggerContainer>
      </main>
    </AppLayout>
  )
}
