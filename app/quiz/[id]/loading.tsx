export default function QuizDetailLoading() {
  return (
    <div className="flex min-h-screen animate-in fade-in duration-300">
      <main className="flex-1 p-4 md:p-6">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="mb-2 h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div className="mb-2 h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-48 animate-pulse rounded bg-gray-100" />
        </div>

        {/* Quiz action card skeleton */}
        <div className="mb-8 h-52 animate-pulse rounded-xl border border-gray-100 bg-white p-6">
          <div className="mb-4 h-6 w-1/3 rounded bg-gray-200" />
          <div className="mb-3 h-4 w-2/3 rounded bg-gray-100" />
          <div className="mb-6 h-4 w-1/2 rounded bg-gray-100" />
          <div className="h-12 w-40 rounded bg-gray-200" />
        </div>

        {/* Tab bar skeleton */}
        <div className="mb-6 flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 w-24 animate-pulse rounded bg-gray-200" />
          ))}
        </div>

        {/* Comments skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-gray-100 bg-white p-4">
              <div className="mb-2 h-4 w-32 rounded bg-gray-200" />
              <div className="h-3 w-full rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </main>

      {/* Right sidebar skeleton */}
      <aside className="hidden w-[280px] shrink-0 border-l border-gray-100 bg-[#F9F9F7] p-4 xl:block">
        <div className="mb-4 h-5 w-20 animate-pulse rounded bg-gray-200" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </aside>
    </div>
  )
}
