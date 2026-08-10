import { Suspense } from 'react'
import { unstable_cache } from 'next/cache'
import { connectDB } from '@/lib/core/db/mongodb'
import { Category, PUBLIC_CATEGORY_MATCH } from '@/lib/modules/quiz/models/Category'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { User } from '@/lib/modules/auth/models/User'
import CategoryFilter from '@/components/quiz/explore/CategoryFilter'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { ExploreSkeleton } from '@/components/quiz/explore/ExploreSkeleton'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Khám phá Môn Học & Đề Thi | FQuiz',
  description: 'Tìm kiếm và khám phá thư viện câu hỏi trắc nghiệm đa chuyên ngành trên FQuiz.',
}

const getCategories = unstable_cache(
  async () => {
    await connectDB()
    const cats = await Category.find(PUBLIC_CATEGORY_MATCH).sort({ name: 1 }).lean()
    
    const catIds = cats.map((c: any) => c._id)
    const quizCounts = await Quiz.aggregate([
      {
        $match: {
          category_id: { $in: catIds },
          status: 'published',
          is_public: true,
          is_temp: { $ne: true }
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
  },
  ['explore-categories-list'],
  { revalidate: 60, tags: ['categories'] }
)

export default async function ExplorePage() {
  const categories = await getCategories()
  const user = await verifySession()

  let initialPinnedCategories: string[] = []
  if (user && ['student', 'dev', 'admin'].includes(user.role)) {
    await connectDB()
    const userDoc = (await User.findById(user.userId).select('pinned_categories').lean()) as any
    initialPinnedCategories = userDoc?.pinned_categories ?? []
  }

  return (
    <AppLayout user={user ? { name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}>
      {/* Background Glow */}
      <div className="absolute inset-x-0 top-0 h-[500px] w-full overflow-hidden -z-10 pointer-events-none flex justify-center transform-gpu">
        <div className="w-full max-w-5xl h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-primary/10 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      <div className="w-full pt-1 sm:pt-3 pb-10 lg:pb-16 relative z-10 space-y-3 sm:space-y-6">
        <div className="text-center max-w-3xl mx-auto px-2">
          <h1 className="text-xl sm:text-3xl md:text-5xl font-black text-foreground tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-3 duration-500">
            Khám phá Danh mục & Đề Thi
          </h1>
        </div>

        <Suspense fallback={<ExploreSkeleton />}>
          <CategoryFilter initialCategories={categories} initialPinnedCategories={initialPinnedCategories} />
        </Suspense>
      </div>
    </AppLayout>
  )
}
