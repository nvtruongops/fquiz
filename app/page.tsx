import Link from 'next/link'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { Sparkles, Map, Layers, TrendingUp, Compass, Zap, BookOpen, ArrowRight, ShieldCheck, CheckCircle2, Bot } from 'lucide-react'
import * as motion from 'framer-motion/client'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent } from '@/components/shared/ui/card'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'FQuiz — Nền tảng Học Ngôn ngữ AI & Ôn thi Trắc nghiệm',
  description: 'Học tiếng Anh với AI, ôn tập Flashcard thuật toán FSRS và luyện thi trắc nghiệm chống gian lận.',
}

export default async function HomePage() {
  const user = await verifySession()

  return (
    <AppLayout user={user ? { name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}>
      {/* Background Mesh Glow */}
      <div className="absolute inset-x-0 top-0 h-[700px] w-full overflow-hidden -z-10 pointer-events-none flex justify-center transform-gpu">
        <div className="w-full max-w-7xl h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#5D7B6F]/20 via-[#A4C3A2]/15 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      <div className="w-full pt-1 sm:pt-2 pb-12 lg:pb-20 relative z-10 space-y-12 sm:space-y-20">
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-white/90 shadow-sm backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-[#5D7B6F]" />
            <span className="text-xs font-black text-[#5D7B6F] uppercase tracking-widest">Nền tảng Học tập Thế hệ Mới</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]"
          >
            Nâng tầm Học Ngôn ngữ AI & <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#5D7B6F] via-[#455A52] to-[#A4C3A2]">
              Ôn thi Trắc nghiệm Thông minh
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto"
          >
            Tích hợp thuật toán lặp lại ngắt quãng (FSRS), đồ thị lộ trình bài học cá nhân hóa và hệ thống thi trắc nghiệm đa chuyên ngành.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Button asChild size="lg" className="rounded-2xl px-8 h-14 bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-[#5D7B6F]/25 transition-all hover:scale-105">
              <Link href="/roadmap">
                <Map className="w-5 h-5 mr-2" />
                Học Ngôn Ngữ AI Ngay
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-2xl px-8 h-14 bg-white/80 border-2 border-slate-200 hover:border-[#5D7B6F] text-slate-800 font-black text-sm uppercase tracking-wider transition-all hover:scale-105">
              <Link href="/explore">
                <Compass className="w-5 h-5 mr-2" />
                Khám phá Đề Thi
              </Link>
            </Button>
          </motion.div>
        </section>

        {/* Dual Service Pillars Showcase */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#5D7B6F]">Hai Trụ Cột Dịch Vụ Cốt Lõi</p>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">Trải nghiệm Học Tập Toàn Diện</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Service 1: AI Language Learning */}
            <Card className="rounded-[36px] border border-white/90 bg-gradient-to-br from-emerald-50/90 via-white/80 to-emerald-50/40 backdrop-blur-2xl p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#5D7B6F]/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none transform-gpu" />

              <div className="w-14 h-14 rounded-2xl bg-[#5D7B6F] text-white flex items-center justify-center shadow-lg shadow-[#5D7B6F]/30">
                <Map className="w-7 h-7" />
              </div>

              <div className="space-y-2 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#5D7B6F] bg-white px-3 py-1 rounded-full border border-emerald-100 shadow-xs">
                  AI Language Service
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Học Ngôn ngữ với AI</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Lộ trình học cây kỹ năng thích ứng, thẻ nhớ SRS FSRS tính toán thời gian lãng quên từ vựng, và trợ lý AI hỗ trợ giải thích trực quan.
                </p>
              </div>

              <ul className="space-y-3 pt-2 relative z-10">
                {[
                  'Sơ đồ cây bài học với điều kiện tiên quyết (Prerequisites)',
                  'Thẻ ôn tập Flashcards FSRS 4 mức đánh giá độ nhớ',
                  'Phân tích tăng trưởng từ vựng & đường cong quên',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-[#5D7B6F] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4 relative z-10">
                <Button asChild className="rounded-2xl px-6 h-12 bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-[#5D7B6F]/20">
                  <Link href="/roadmap">
                    Khám phá Lộ trình bài học <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Service 2: Quiz & Exam Testing */}
            <Card className="rounded-[36px] border border-white/90 bg-gradient-to-br from-blue-50/90 via-white/80 to-blue-50/40 backdrop-blur-2xl p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none transform-gpu" />

              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Zap className="w-7 h-7" />
              </div>

              <div className="space-y-2 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-white px-3 py-1 rounded-full border border-blue-100 shadow-xs">
                  Quiz & Exam Service
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Ôn Thi Trắc Nghiệm & Kiểm Tra</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Ngân hàng câu hỏi đa dạng theo môn học, trộn đề ngẫu nhiên, chế độ chống gian lận và xem lại đáp án chi tiết.
                </p>
              </div>

              <ul className="space-y-3 pt-2 relative z-10">
                {[
                  'Tìm kiếm môn học theo mã',
                  'Tạo Quiz Trộn từ nhiều bộ đề ôn thi cá nhân',
                  'Lưu vết lịch sử thi & thống kê điểm số tức thì',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4 relative z-10">
                <Button asChild className="rounded-2xl px-6 h-12 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-blue-500/20">
                  <Link href="/explore">
                    Khám phá Thư viện Đề thi <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
