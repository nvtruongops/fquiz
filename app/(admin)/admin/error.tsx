'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center font-sans">
      <div className="max-w-sm border-2 border-[#101010] bg-[#f3f3f3] p-8 text-center">
        <h2 className="text-[22px] font-bold text-[#111111]">Lỗi hệ thống</h2>
        <p className="mt-2 text-[15px] text-[#3d3d3d]">
          {error.message || 'Đã xảy ra lỗi không mong muốn.'}
        </p>
        <button
          onClick={reset}
          className="mt-5 rounded-none border-2 border-[#101010] bg-[#efefef] px-6 py-2 text-[15px] font-semibold text-[#111111] hover:bg-white transition-colors"
        >
          Thử lại
        </button>
      </div>
    </div>
  )
}
