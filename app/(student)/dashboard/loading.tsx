import { Skeleton } from '@/components/shared/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F9F9F7] p-6 md:p-10 space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-96" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )
}
