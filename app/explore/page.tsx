import { Suspense } from 'react'
import { connectDB } from '@/lib/core/db/mongodb'
import { Category } from '@/lib/modules/quiz/models/Category'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import CategoryFilter from '@/components/quiz/explore/CategoryFilter'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { Sparkles, Compass } from 'lucide-react'
import * as motion from 'framer-motion/client'

export const metadata = {
  title: 'Khám phá Môn Học & Đề Thi | FQuiz',
  description: 'Tìm kiếm và khám phá thư viện câu hỏi trắc nghiệm đa chuyên ngành trên FQuiz.',
}

export const revalidate = 60

async function getCategories() {
  await connectDB()
  const cats = await Category.find({ type: 'public', status: 'approved' }).sort({ name: 1 }).lean()
  
  const catIds = cats.map((c: any) => c._id)
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
  
  const countMap = new Map(quizCounts.map((item: any) => [item._id.toString(), item.count]))

  return cats.map((c: any) => ({
    id: c._id.toString(),
    name: c.name,
    quizCount: countMap.get(c._id.toString()) ?? 0
  }))
}

export default async function ExplorePage() {
  const categories = await getCategories()
  const user = await verifySession()

  return (
    <AppLayout user={user ? { name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}>
      {/* Background Glow */}
      <div className="absolute inset-x-0 top-0 h-[600px] w-full overflow-hidden -z-10 pointer-events-none flex justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="w-[700px] h-[700px] bg-gradient-to-tr from-[#5D7B6F]/20 to-transparent blur-[120px] rounded-full mix-blend-multiply absolute -top-40" 
        />
      </div>

      <div className="w-full py-10 lg:py-16 relative z-10 space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-white/90 shadow-sm backdrop-blur-md"
          >
            <Compass className="w-4 h-4 text-[#5D7B6F]" />
            <span className="text-xs font-black text-[#5D7B6F] uppercase tracking-widest">Không gian Trắc nghiệm & Thi thử</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight"
          >
            Khám phá Danh mục & Đề Thi
          </motion.h1>
        </div>

        <Suspense fallback={
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#A4C3A2]/30 border-t-[#5D7B6F]" />
          </div>
        }>
          <CategoryFilter initialCategories={categories} />
        </Suspense>
      </div>
    </AppLayout>
  )
}
