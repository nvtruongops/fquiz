export default function CategoriesLoading() {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded-lg mb-8" />

        {/* Create form skeleton */}
        <div className="mb-6 bg-white border border-gray-100 rounded-xl p-6">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
          <div className="flex gap-2">
            <div className="h-10 flex-1 bg-gray-100 rounded-lg" />
            <div className="h-10 w-24 bg-gray-200 rounded-lg" />
          </div>
        </div>

        {/* Category list skeleton */}
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="space-y-4">
            <div className="h-12 w-full bg-gray-50 rounded-md" />
            <div className="h-12 w-full bg-gray-50 rounded-md" />
            <div className="h-12 w-full bg-gray-50 rounded-md" />
            <div className="h-12 w-full bg-gray-50 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}
