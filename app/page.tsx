import { Suspense } from 'react'
import { connectDB } from '@/lib/core/db/mongodb'
import { Category } from '@/lib/modules/quiz/models/Category'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import CategoryFilter from '@/components/quiz/explore/CategoryFilter'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { HelpCircle, BookOpen, Sparkles } from "lucide-react"
import { FAQItem, StepItem } from "@/components/shared/landing/LandingItems"
import * as motion from "framer-motion/client"
import Link from 'next/link'
import { ClientOnly } from '@/components/shared/utils/ClientOnly'

export const metadata = {
  title: 'Khám phá Môn Học | FQuiz',
  description: 'Tìm kiếm và khám phá thư viện câu hỏi trắc nghiệm đa chuyên ngành trên FQuiz.',
}

export const revalidate = 60

async function getCategories() {
  await connectDB()
  const cats = await Category.find({ type: 'public', status: 'approved' }).sort({ name: 1 }).lean()
  
  const catIds = cats.map(c => c._id)
  const quizCounts = await Quiz.aggregate([
    {
      $match: {
        category_id: { $in: catIds },
        status: 'published'
      }
    },
    {
      $group: {
        _id: '$category_id',
        count: { $sum: 1 }
      }
    }
  ])
  
  const countMap = new Map(quizCounts.map(item => [item._id.toString(), item.count]))

  return cats.map((c: any) => ({
    id: c._id.toString(),
    name: c.name,
    quizCount: countMap.get(c._id.toString()) ?? 0
  }))
}

export default async function HomePage() {
  const categories = await getCategories()
  const user = await verifySession()

  return (
    <AppLayout user={user ? { name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-x-0 top-0 h-[800px] w-full overflow-hidden -z-10 pointer-events-none flex justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="w-[800px] h-[800px] bg-gradient-to-tr from-[#5D7B6F]/20 to-transparent blur-[120px] rounded-full mix-blend-multiply absolute -top-40" 
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} 
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="w-[600px] h-[600px] bg-gradient-to-bl from-[#A4C3A2]/30 to-transparent blur-[100px] rounded-full mix-blend-multiply absolute top-[100px] right-[-100px]" 
        />
      </div>

      <div className="container mx-auto py-12 lg:py-20 relative z-10">
        <div className="mb-14 text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-white/80 shadow-sm backdrop-blur-md mb-6"
          >
            <Sparkles className="w-4 h-4 text-[#5D7B6F]" />
            <span className="text-xs font-bold text-[#5D7B6F] uppercase tracking-widest">Nền tảng học tập thông minh</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="text-[clamp(40px,5vw+16px,64px)] font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-[#5D7B6F] to-[#A4C3A2] leading-[1.1] pb-2 tracking-tight"
          >
            Khám phá Không giới hạn
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="mt-6 text-[clamp(16px,1.5vw+10px,20px)] text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto"
          >
            Tìm kiếm nhanh chóng, ôn luyện hiệu quả. Chọn danh mục bạn quan tâm để bắt đầu chinh phục điểm cao ngay hôm nay.
          </motion.p>
        </div>

        <Suspense fallback={
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#A4C3A2]/30 border-t-[#5D7B6F]" />
          </div>
        }>
          <CategoryFilter initialCategories={categories} />
        </Suspense>
      </div>

      <ClientOnly>
        {/* Footer */}
        <footer className="relative z-10 border-t border-[#A4C3A2]/20 pt-16 pb-12 px-6 mt-auto">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
              <div className="col-span-1">
                <Link href="/" className="flex items-center gap-3 mb-6 group w-fit">
                  <div className="w-12 h-12 rounded-2xl bg-[#5D7B6F] flex items-center justify-center shadow-lg shadow-[#5D7B6F]/20 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-black text-slate-900 text-3xl tracking-tighter">FQuiz</span>
                </Link>
                <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-sm">
                  Nền tảng học tập và ôn luyện trắc nghiệm hàng đầu dành cho sinh viên Việt Nam, giúp tối ưu hóa thời gian và hiệu quả học tập.
                </p>
              </div>

              <div className="flex md:justify-end">
                <div>
                  <h4 className="font-black text-slate-900 mb-6 uppercase text-xs tracking-widest">Pháp lý & Hỗ trợ</h4>
                  <ul className="space-y-4 text-sm font-bold text-slate-500">
                    <li><Link href="/terms" className="hover:text-[#5D7B6F] transition-colors">Điều khoản dịch vụ</Link></li>
                    <li><Link href="/privacy" className="hover:text-[#5D7B6F] transition-colors">Chính sách bảo mật</Link></li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-xs font-bold text-slate-400" suppressHydrationWarning>
                © {new Date().getFullYear()} FQuiz Inc. Made with ❤️ for Education.
              </p>
            </div>
          </div>
        </footer>
      </ClientOnly>
    </AppLayout>
  )
}
