import { Skeleton } from '@/components/shared/ui/skeleton'

export default function ProfileLoading() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F9F9F7] p-6 md:p-10 space-y-8">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <Skeleton className="w-24 h-24 rounded-full" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-72 rounded-3xl" />
    </div>
  )
}
