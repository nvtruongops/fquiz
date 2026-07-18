import { Skeleton } from '@/components/shared/ui/skeleton'

export default function HistoryLoading() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F9F9F7] p-6 md:p-10 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
