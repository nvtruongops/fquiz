import Link from 'next/link'
import { cn } from '@/lib/core/utils/cn'

export function Footer({ className }: { className?: string } = {}) {
  return (
    <footer className={cn('w-full bg-card/80 backdrop-blur-md border-t border-border/80 text-card-foreground mt-auto py-4', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
        <p>© {new Date().getFullYear()} FQuiz. Tất cả các quyền được bảo lưu.</p>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-primary transition-colors font-semibold">
            Chính sách bảo mật
          </Link>
          <Link href="/terms" className="hover:text-primary transition-colors font-semibold">
            Điều khoản sử dụng
          </Link>
        </div>
      </div>
    </footer>
  )
}
