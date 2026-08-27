import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">Trang bạn tìm kiếm không tồn tại hoặc đã bị di chuyển.</p>
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-colors bg-primary rounded-md shadow hover:bg-primary/90"
        >
          Trở về trang chủ
        </Link>
      </div>
    </div>
  )
}
