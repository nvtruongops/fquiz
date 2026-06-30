export default function StudentLoading() {
  return (
    <div className="flex min-h-screen animate-in fade-in duration-300">
      {/* Sidebar skeleton */}
      <aside className="hidden w-[220px] shrink-0 border-r border-gray-100 bg-[#F9F9F7] p-4 lg:block">
        <div className="mb-6 mt-2 h-5 w-24 animate-pulse rounded bg-gray-200" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 p-4 md:p-6">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-gray-100 bg-white p-4">
              <div className="mb-3 h-4 w-3/4 rounded bg-gray-200" />
              <div className="mb-2 h-3 w-full rounded bg-gray-100" />
              <div className="h-3 w-1/2 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
