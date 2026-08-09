'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center font-sans p-4">
      <div className="max-w-sm rounded-2xl border border-border bg-card text-card-foreground p-8 text-center shadow-md">
        <h2 className="text-xl font-black text-card-foreground">Lỗi hệ thống Admin</h2>
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          {error.message || 'Đã xảy ra lỗi không mong muốn.'}
        </p>
        <button
          onClick={reset}
          className="mt-5 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    </div>
  )
}
