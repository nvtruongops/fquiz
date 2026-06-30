export default function ExploreLoading() {
  return (
    <div className="flex min-h-screen animate-in fade-in duration-300">
      {/* Category sidebar skeleton */}
      <aside className="hidden w-[240px] shrink-0 border-r border-gray-100 bg-[#F9F9F7] p-4 md:block">
        <div className="mb-4 h-5 w-20 animate-pulse rounded bg-gray-200" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 p-4 md:p-6">
        <div className="mb-6 h-10 w-full max-w-md animate-pulse rounded-xl bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-gray-100 bg-white p-5">
              <div className="mb-3 h-5 w-2/3 rounded bg-gray-200" />
              <div className="mb-2 h-4 w-full rounded bg-gray-100" />
              <div className="mb-4 h-4 w-3/4 rounded bg-gray-100" />
              <div className="h-8 w-20 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
