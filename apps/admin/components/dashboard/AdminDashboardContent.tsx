'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layers, FileQuestion, Users, ClipboardList, ArrowRight } from 'lucide-react'
import { RecentRegistrationsTable } from '@/components/dashboard/RecentRegistrationsTable'
import { useTranslations } from '@fquiz/ui/i18n'

interface AdminDashboardContentProps {
  counts: Record<string, number>
  recentUsers: Array<{
    _id: string
    username: string
    email: string
    role: string
    status: string
    created_at: string
  }>
}

const statCards = [
  { key: 'categories', labelKey: 'adminDashboard.categories', icon: Layers, color: 'text-success-fg', bg: 'bg-success-bg' },
  { key: 'quizzes', labelKey: 'adminDashboard.quizzes', icon: FileQuestion, color: 'text-info-fg', bg: 'bg-info-bg' },
  { key: 'users', labelKey: 'adminDashboard.students', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'sessions', labelKey: 'adminDashboard.examAttempts', icon: ClipboardList, color: 'text-warning-fg', bg: 'bg-warning-bg' },
] as const

export function AdminDashboardContent({ counts, recentUsers }: AdminDashboardContentProps) {
  const t = useTranslations()

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('adminDashboard.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('adminDashboard.overview')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map(({ key, labelKey, icon: Icon, color, bg }) => (
          <Card key={key} className="bg-card border-border shadow-xs hover:shadow-md transition-shadow text-card-foreground">
            <CardContent className="pt-5 pb-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${color}`} aria-hidden="true" />
              </div>
              <div>
                <p className="text-3xl font-bold text-card-foreground">{counts[key]}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">{t(labelKey)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild><Link href="/categories">{t('adminDashboard.manageCategories')}</Link></Button>
        <Button asChild><Link href="/quizzes">{t('adminDashboard.manageQuizzes')}</Link></Button>
        <Button asChild><Link href="/question-bank">{t('adminDashboard.questionBank')}</Link></Button>
        <Button asChild><Link href="/users">{t('adminDashboard.manageUsers')}</Link></Button>
        <Button asChild variant="outline"><Link href="/settings">{t('adminDashboard.systemSettings')}</Link></Button>
      </div>

      <Card className="bg-card border-border shadow-xs text-card-foreground">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-foreground text-lg">{t('adminDashboard.recentRegistrations')}</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/users" className="flex items-center gap-1">
              {t('adminDashboard.viewAll')} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <RecentRegistrationsTable users={recentUsers} />
        </CardContent>
      </Card>
    </div>
  )
}
