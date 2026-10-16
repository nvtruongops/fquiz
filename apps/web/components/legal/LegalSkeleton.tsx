import { Skeleton } from '@/components/shared/ui/skeleton'

export function LegalSkeleton({ title }: { title: string }) {
  return (
    <main className="max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 md:px-8 space-y-6" aria-busy="true" aria-label={`Loading ${title}`}>
      {/* Grid Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: TOC Skeleton */}
        <div className="lg:col-span-4 lg:sticky lg:top-8 space-y-4">
          {/* Mobile Bar Skeleton */}
          <div className="lg:hidden bg-card border border-border rounded-2xl p-3 shadow-md space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-border">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>

          {/* Desktop Card Skeleton */}
          <div className="hidden lg:block bg-card border border-border rounded-3xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 rounded-md" />
              <div className="h-8 sm:h-9 w-48 bg-muted rounded-xl" />
              <Skeleton className="h-3 w-36 rounded-md pt-1" />
            </div>
            <div className="border-t border-border pt-4 space-y-2">
              <Skeleton className="h-3 w-28 rounded-md mb-3" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-transparent">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="w-4 h-4 rounded-md" />
                    <Skeleton className="h-3.5 w-32 rounded-md" />
                  </div>
                  <Skeleton className="w-3.5 h-3.5 rounded-md" />
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Right Column: Content Stream Skeleton */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-primary/5 border border-primary/10 p-6 rounded-3xl space-y-2">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
          </div>

          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-2xl" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-2.5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-48 sm:w-64 rounded-md" />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton className="h-3.5 w-full rounded-md" />
                <Skeleton className="h-3.5 w-5/6 rounded-md" />
                <Skeleton className="h-3.5 w-4/6 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
