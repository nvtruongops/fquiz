import { Suspense } from 'react'
import CategoryFilter from '@/components/quiz/explore/CategoryFilter'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { ExploreSkeleton } from '@/components/quiz/explore/ExploreSkeleton'
import { getPublicCategories, getStudentPinnedCategoryIds } from '@/lib/modules/quiz/services/category.service'
import { ExplorePageHeading } from '@/components/quiz/explore/ExplorePageHeading'
import { getLocalizedMetadata } from '@/lib/core/utils/metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return getLocalizedMetadata('explore')
}

async function CategoryFilterLoader({ userId }: { userId?: string }) {
  let initialCategories = undefined
  let initialPinnedCategories = undefined

  try {
    const [categories, pinned] = await Promise.all([
      getPublicCategories(),
      userId ? getStudentPinnedCategoryIds(userId) : Promise.resolve([]),
    ])
    initialCategories = categories
    initialPinnedCategories = pinned
  } catch (err) {
    // If server-side query fails, gracefully fallback to client-side fetching in CategoryFilter
    console.error('[ExplorePage] Error pre-fetching categories:', err)
  }

  return (
    <CategoryFilter
      initialCategories={initialCategories}
      initialPinnedCategories={initialPinnedCategories}
    />
  )
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
        <ExplorePageHeading />

        <Suspense fallback={<ExploreSkeleton />}>
          <CategoryFilterLoader userId={user?.userId} />
        </Suspense>
      </div>
    </AppLayout>
  )
}
