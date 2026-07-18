import { Skeleton } from '@/components/shared/ui/skeleton'

export default function AdminUsersLoading() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <Skeleton className="h-12 rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
