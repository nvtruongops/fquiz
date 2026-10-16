import { ExploreSkeleton } from '@/components/quiz/explore/ExploreSkeleton'

export default function ExploreLoading() {
  return (
    <div className="w-full pt-1 sm:pt-3 pb-24 sm:pb-28 lg:pb-16 relative z-10 space-y-3 sm:space-y-6">
      <div className="text-center max-w-3xl mx-auto px-2 space-y-1.5 animate-pulse">
        <div className="h-8 sm:h-12 w-64 sm:w-96 bg-muted rounded-xl mx-auto" />
        <div className="h-4 w-72 sm:w-80 bg-muted/60 rounded-lg mx-auto" />
      </div>

      <ExploreSkeleton />
    </div>
  )
}
