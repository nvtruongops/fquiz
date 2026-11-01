import Link from 'next/link'
import { cn } from '@/lib/core/utils/cn'
import { useTranslations } from '@fquiz/ui/i18n'

export function Footer({ className }: { className?: string } = {}) {
  const t = useTranslations()
  return (
    <footer className={cn('w-full bg-card/80 backdrop-blur-md border-t border-border/80 text-card-foreground mt-auto py-4', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
        <p>© {new Date().getFullYear()} FQuiz. {t('footer.rights')}</p>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-primary transition-colors font-semibold">
            {t('footer.privacy')}
          </Link>
          <Link href="/terms" className="hover:text-primary transition-colors font-semibold">
            {t('footer.terms')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
