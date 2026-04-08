export default function AdminLoading() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded-lg mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <div className="bg-white rounded-xl border border-gray-100 p-6 h-32" />
          <div className="bg-white rounded-xl border border-gray-100 p-6 h-32" />
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-44 bg-gray-200 rounded-lg" />
          <div className="h-10 w-44 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
