import { Skeleton } from '@/components/shared/ui/skeleton'

export default function FlashcardsLoading() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F9F9F7] p-6 md:p-10 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-72" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-3xl" />
        ))}
      </div>
    </div>
  )
}
