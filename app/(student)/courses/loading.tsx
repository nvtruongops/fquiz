import { Skeleton } from '@/components/shared/ui/skeleton'

export default function CourseDetailLoading() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F9F9F7] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <Skeleton className="h-5 w-20 rounded-full" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-10 w-72 rounded-xl" />
        </div>
        <div className="flex gap-6 border-b border-slate-200/80 pb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
