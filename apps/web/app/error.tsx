'use client'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page-bg font-sans p-6 text-card-foreground">
      <div className="max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <h2 className="text-2xl font-black text-card-foreground">Có lỗi xảy ra</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.'}
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-xl border border-border bg-muted px-5 py-2.5 text-xs font-bold text-card-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          >
            Thử lại
          </button>
          <button
            onClick={() => globalThis.location.href = '/'}
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  )
}
