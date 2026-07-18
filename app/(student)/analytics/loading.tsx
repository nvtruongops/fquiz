import { Skeleton } from '@/components/shared/ui/skeleton'

export default function AnalyticsLoading() {
  return (
    <div className="w-full py-8 space-y-8 p-6 md:p-10">
      <Skeleton className="h-32 rounded-[32px]" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-3xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-[32px]" />
        <Skeleton className="h-72 rounded-[32px]" />
      </div>
    </div>
  )
}
