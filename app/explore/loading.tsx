import { Skeleton } from '@/components/shared/ui/skeleton'

export default function ExploreLoading() {
  return (
    <div className="w-full pt-2 sm:pt-3 pb-10 lg:pb-16 space-y-4 sm:space-y-6">
      <div className="text-center max-w-3xl mx-auto">
        <Skeleton className="h-12 w-96 mx-auto" />
      </div>
      <div className="max-w-xl mx-auto w-full px-4">
        <Skeleton className="h-12 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[195px] rounded-3xl" />
        ))}
      </div>
    </div>
  )
}
