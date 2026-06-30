'use client'

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center font-sans">
      <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Có lỗi xảy ra</h2>
        <p className="mt-2 text-sm text-gray-600">
          Không thể tải trang này. Vui lòng thử lại hoặc quay về trang chủ.
        </p>
        <div className="mt-5 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-[#5D7B6F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4a6358] transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    </div>
  )
}
