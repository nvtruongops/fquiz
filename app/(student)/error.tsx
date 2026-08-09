'use client'

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center font-sans p-4">
      <div className="max-w-sm rounded-2xl border border-border bg-card text-card-foreground p-8 text-center shadow-md">
        <h2 className="text-xl font-bold text-card-foreground">Có lỗi xảy ra</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Không thể tải trang này. Vui lòng thử lại hoặc quay về trang chủ.
        </p>
        <div className="mt-5 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </div>
    </div>
  )
}
