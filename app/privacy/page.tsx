import type { Metadata } from 'next'
import Link from 'next/link'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { ArrowLeft, ShieldCheck, Lock, Cookie, UserCheck, FileText, ChevronRight } from 'lucide-react'
import { GsapStaggerContainer } from '@/components/shared/gsap/GsapStaggerContainer'

export const metadata: Metadata = {
  title: 'Chính sách bảo mật — FQuiz',
  description: 'Chính sách bảo mật và cam kết an toàn dữ liệu cá nhân của người dùng trên nền tảng FQuiz.',
  openGraph: {
    title: 'Chính sách bảo mật — FQuiz',
    description: 'Chính sách bảo mật và cam kết an toàn dữ liệu cá nhân của người dùng trên nền tảng FQuiz.',
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
            <span>Quay lại trang chủ</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Pháp lý & An toàn
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
                  Chính sách bảo mật
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
                  href="#minimization"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>1. Thu thập tối giản</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="#security"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-success-fg" />
                    <span>2. Mã hóa mật khẩu</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="#cookies"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Cookie className="w-4 h-4 text-warning-fg" />
                    <span>3. Cookie & Sessions</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="#rights"
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-card-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <span>4. Quyền của người dùng</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </a>
              </nav>

              <hr className="border-border" />

              {/* Quick Link to Terms */}
              <div className="bg-muted p-4 rounded-2xl border border-border space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground">Bạn muốn xem Điều khoản sử dụng?</p>
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:underline"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Xem Điều khoản sử dụng</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* Right Column: Detailed Document Stream */}
          <div className="lg:col-span-8 space-y-6">
            <div className="legal-section bg-primary/10 border border-primary/20 p-6 rounded-3xl space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-primary">Tóm tắt Cam kết</p>
              <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">
                FQuiz cam kết bảo vệ sự riêng tư và an toàn dữ liệu của bạn. Xin vui lòng đọc kỹ các mục chi tiết bên dưới để hiểu rõ cách chúng tôi thu thập, lưu trữ và bảo vệ thông tin cá nhân.
              </p>
            </div>

            {/* Section 1 */}
            <section id="minimization" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Điều 01</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Thu thập tối giản (Data Minimization)</h2>
                </div>
              </div>
              <ul className="list-disc pl-6 space-y-2.5 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                <li>Chúng tôi chỉ thu thập những thông tin cần thiết nhất để vận hành hệ thống: <strong>Tên đăng nhập (Username)</strong>, <strong>Email</strong> và <strong>Lịch sử làm bài (Kết quả quiz)</strong>.</li>
                <li>Chúng tôi tuyệt đối không thu thập thông tin định danh cá nhân nhạy cảm, vị trí địa lý chính xác, hay dữ liệu thiết bị dư thừa.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section id="security" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Điều 02</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Mã hóa mật khẩu (Data Security)</h2>
                </div>
              </div>
              <ul className="list-disc pl-6 space-y-2.5 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                <li>Mật khẩu của bạn được mã hóa một chiều (hashing) bằng chuẩn mã hóa an toàn trước khi lưu vào cơ sở dữ liệu.</li>
                <li><strong>Không một ai</strong> (kể cả đội ngũ quản trị hay kỹ sư của FQuiz) có thể xem hoặc biết được mật khẩu dạng văn bản gốc của bạn.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="cookies" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <Cookie className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Điều 03</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Cookie & Phiên làm việc (Sessions)</h2>
                </div>
              </div>
              <ul className="list-disc pl-6 space-y-2.5 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                <li>FQuiz sử dụng các token xác thực (JWT) được lưu trữ an toàn trong HTTP-only Cookies để duy trì trạng thái đăng nhập của bạn.</li>
                <li>Các cookies này chỉ sử dụng cho mục đích bảo mật xác thực, hoàn toàn không theo dõi quảng cáo thương mại.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section id="rights" className="legal-section bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Điều 04</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Quyền lợi người dùng</h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                Bạn có quyền yêu cầu trích xuất toàn bộ dữ liệu lịch sử làm bài hoặc xóa vĩnh viễn tài khoản khỏi hệ thống FQuiz vào bất cứ lúc nào. Khi có yêu cầu xóa, mọi truy vết về kết quả thi của bạn sẽ được xóa sổ hoàn toàn khỏi cơ sở dữ liệu.
              </p>
            </section>
          </div>
        </GsapStaggerContainer>
      </main>
    </AppLayout>
  )
}
