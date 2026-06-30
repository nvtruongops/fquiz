'use client'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f3f3] font-sans">
      <div className="max-w-sm border-2 border-[#101010] bg-white p-8 text-center">
        <h2 className="text-[26px] font-bold text-[#111111]">Có lỗi xảy ra</h2>
        <p className="mt-2 text-[16px] text-[#444444]">
          {error.message || 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.'}
        </p>
        <div className="mt-5 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-none border-2 border-[#101010] bg-[#efefef] px-6 py-2 text-[16px] font-semibold text-[#111111] hover:bg-white transition-colors"
          >
            Thử lại
          </button>
          <button
            onClick={() => globalThis.location.href = '/'}
            className="rounded-none border-2 border-[#101010] bg-[#101010] px-6 py-2 text-[16px] font-semibold text-white hover:bg-[#333] transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  )
}
