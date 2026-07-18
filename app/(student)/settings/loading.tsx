import { Skeleton } from '@/components/shared/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F9F9F7] p-6 md:p-10 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-52 rounded-3xl" />
      </div>
    </div>
  )
}
