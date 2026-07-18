import { Skeleton } from '@/components/shared/ui/skeleton'

export default function ExploreLoading() {
  return (
    <div className="w-full py-10 lg:py-16 space-y-10">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-56 rounded-full mx-auto" />
        <Skeleton className="h-12 w-96 mx-auto" />
      </div>
      <div className="max-w-2xl mx-auto w-full px-4">
        <Skeleton className="h-16 rounded-[2.5rem]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[195px] rounded-3xl" />
        ))}
      </div>
    </div>
  )
}
