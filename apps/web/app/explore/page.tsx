import { Suspense } from 'react'
import CategoryFilter from '@/components/quiz/explore/CategoryFilter'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { ExploreSkeleton } from '@/components/quiz/explore/ExploreSkeleton'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Khám phá Môn Học & Đề Thi | FQuiz',
  description: 'Tìm kiếm và khám phá thư viện câu hỏi trắc nghiệm đa chuyên ngành trên FQuiz.',
}

export default async function ExplorePage() {
  const user = await verifySession()

  return (
    <AppLayout user={user ? { _id: user.userId, name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}>
      {/* Background Glow */}
      <div className="absolute inset-x-0 top-0 h-[500px] w-full overflow-hidden -z-10 pointer-events-none flex justify-center transform-gpu">
        <div className="w-full max-w-5xl h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-primary/10 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      <div className="w-full pt-1 sm:pt-3 pb-24 sm:pb-28 lg:pb-16 relative z-10 space-y-3 sm:space-y-6">
        <div className="text-center max-w-3xl mx-auto px-2 space-y-1.5">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-foreground tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-3 duration-500">
            Khám phá Danh mục & Đề Thi
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
            Tìm kiếm môn học chuyên ngành, luyện tập bộ đề thi trắc nghiệm và trộn đề thông minh.
          </p>
        </div>

        <Suspense fallback={<ExploreSkeleton />}>
          <CategoryFilter />
        </Suspense>
      </div>
    </AppLayout>
  )
}

