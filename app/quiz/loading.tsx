export default function QuizLoading() {
  return (
    <div className="flex min-h-screen animate-in fade-in duration-300">
      {/* Sidebar skeleton */}
      <aside className="hidden w-[220px] shrink-0 border-r border-gray-100 bg-[#F9F9F7] p-4 lg:block">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6">
        <div className="mb-4 h-6 w-32 animate-pulse rounded bg-gray-200" />
        <div className="mb-6 h-10 w-64 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-gray-100 bg-white p-5">
              <div className="mb-3 h-5 w-2/3 rounded bg-gray-200" />
              <div className="mb-2 h-4 w-full rounded bg-gray-100" />
              <div className="mb-4 h-4 w-3/4 rounded bg-gray-100" />
              <div className="h-8 w-24 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
