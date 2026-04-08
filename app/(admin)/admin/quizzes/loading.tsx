export default function QuizzesLoading() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto animate-pulse">
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-40 bg-gray-200 rounded-lg" />
          <div className="h-10 w-32 bg-gray-200 rounded-lg" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-100 rounded-xl p-6 h-48" />
          <div className="bg-white border border-gray-100 rounded-xl p-6 h-48" />
          <div className="bg-white border border-gray-100 rounded-xl p-6 h-48" />
          <div className="bg-white border border-gray-100 rounded-xl p-6 h-48" />
          <div className="bg-white border border-gray-100 rounded-xl p-6 h-48" />
          <div className="bg-white border border-gray-100 rounded-xl p-6 h-48" />
        </div>
      </div>
    </div>
  )
}
