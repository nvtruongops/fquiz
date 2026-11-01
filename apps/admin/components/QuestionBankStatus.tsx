'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useTranslations } from '@fquiz/ui/i18n'

interface CategoryStatus {
  category_id: string
  category_name: string
  status: 'not_migrated' | 'partial' | 'synced'
  total_quizzes: number
  total_bank_questions: number
  migrated_quiz_codes: string[]
  not_migrated_quiz_codes: string[]
}

interface StatusData {
  total_categories: number
  not_migrated: number
  partial: number
  synced: number
  categories: CategoryStatus[]
}

export function QuestionBankStatus() {
  const t = useTranslations()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<StatusData | null>(null)
  const [filter, setFilter] = useState<'all' | 'not_migrated' | 'partial' | 'synced'>('all')

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/question-bank/status', {
        credentials: 'include',
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to fetch status:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = data?.categories.filter(c =>
    filter === 'all' ? true : c.status === filter
  ) ?? []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter(filter === 'not_migrated' ? 'all' : 'not_migrated')}
          className={cn(
            "p-4 rounded-xl border text-left transition-all cursor-pointer",
            filter === 'not_migrated'
              ? "border-destructive/40 bg-destructive/10"
              : "border-border bg-card hover:bg-destructive/5"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-5 h-5 text-destructive" />
            <span className="text-sm font-bold text-destructive">{t('questionBankStatus.notMigrated')}</span>
          </div>
          <p className="text-3xl font-black text-destructive">{data?.not_migrated ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('questionBankStatus.categories')}</p>
        </button>

        <button
          onClick={() => setFilter(filter === 'partial' ? 'all' : 'partial')}
          className={cn(
            "p-4 rounded-xl border text-left transition-all cursor-pointer",
            filter === 'partial'
              ? "border-warning-border bg-warning-bg"
              : "border-border bg-card hover:bg-warning-bg/50"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-warning-fg" />
            <span className="text-sm font-bold text-warning-fg">{t('questionBankStatus.hasNewQuizzes')}</span>
          </div>
          <p className="text-3xl font-black text-warning-fg">{data?.partial ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('questionBankStatus.categories')}</p>
        </button>

        <button
          onClick={() => setFilter(filter === 'synced' ? 'all' : 'synced')}
          className={cn(
            "p-4 rounded-xl border text-left transition-all cursor-pointer",
            filter === 'synced'
              ? "border-success-border bg-success-bg"
              : "border-border bg-card hover:bg-success-bg/50"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-success-fg" />
            <span className="text-sm font-bold text-success-fg">{t('questionBankStatus.fullySynced')}</span>
          </div>
          <p className="text-3xl font-black text-success-fg">{data?.synced ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('questionBankStatus.categories')}</p>
        </button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {filter === 'all' && t('questionBankStatus.allTitle', { count: data?.total_categories ?? 0 })}
              {filter === 'not_migrated' && t('questionBankStatus.notMigratedTitle', { count: data?.not_migrated ?? 0 })}
              {filter === 'partial' && t('questionBankStatus.unmigratedTitle', { count: data?.partial ?? 0 })}
              {filter === 'synced' && t('questionBankStatus.syncedTitle', { count: data?.synced ?? 0 })}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchStatus}
              disabled={loading}
              aria-label={t('questionBankStatus.refresh')}
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                : <RefreshCw className="w-4 h-4" aria-hidden="true" />
              }
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t('questionBankStatus.empty')}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map(cat => (
                <CategoryRow key={cat.category_id} category={cat} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CategoryRow({ category }: { category: CategoryStatus }) {
  const t = useTranslations()
  const [expanded, setExpanded] = useState(false)

  const statusConfig = {
    not_migrated: {
      icon: <XCircle className="w-4 h-4 text-destructive" aria-hidden="true" />,
      badge: <Badge variant="destructive" className="text-xs">{t('questionBankStatus.notMigrated')}</Badge>,
      bg: 'border-destructive/20 bg-destructive/5',
    },
    partial: {
      icon: <AlertTriangle className="w-4 h-4 text-warning-fg" aria-hidden="true" />,
      badge: <Badge variant="warning" className="text-xs">{t('questionBankStatus.hasNewQuizzes')}</Badge>,
      bg: 'border-warning-border/40 bg-warning-bg/20',
    },
    synced: {
      icon: <CheckCircle2 className="w-4 h-4 text-success-fg" aria-hidden="true" />,
      badge: <Badge variant="success" className="text-xs">{t('questionBankStatus.fullySynced')}</Badge>,
      bg: 'border-success-border/40 bg-success-bg/20',
    },
  }

  const config = statusConfig[category.status]

  return (
    <div className={cn("border rounded-lg overflow-hidden", config.bg)}>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={t('questionBankStatus.categoryDetails', { action: expanded ? t('questionBankStatus.collapse') : t('questionBankStatus.expand'), name: category.category_name })}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
      >
        {config.icon}
        <span className="font-semibold text-card-foreground flex-1">{category.category_name}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {t('questionBankStatus.quizBankCount', { quizzes: category.total_quizzes, questions: category.total_bank_questions })}
          </span>
          {config.badge}
          <span className="text-muted-foreground text-xs" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-3 bg-card">
          {category.not_migrated_quiz_codes.length > 0 && (
            <div>
              <p className="text-xs font-bold text-destructive mb-2 flex items-center gap-1">
                <XCircle className="w-3 h-3" aria-hidden="true" />
                {t('questionBankStatus.notMigratedCodes', { count: category.not_migrated_quiz_codes.length })}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {category.not_migrated_quiz_codes.map(code => (
                  <Badge key={code} variant="outline" className="text-xs text-destructive border-destructive/30">
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {category.migrated_quiz_codes.length > 0 && (
            <div>
              <p className="text-xs font-bold text-success-fg mb-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                {t('questionBankStatus.migratedCodes', { count: category.migrated_quiz_codes.length })}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {category.migrated_quiz_codes.map(code => (
                  <Badge key={code} variant="outline" className="text-xs text-success-fg border-success-border">
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
