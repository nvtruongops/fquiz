import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, Loader2 } from 'lucide-react'
import { ConflictPreview } from './ConflictPreview'
import type { ScanResult } from '@/hooks/question-bank/useQuestionBankMigration'
import { useTranslations } from '@fquiz/ui/i18n'

interface MigrationScanReviewProps {
  scanResult: ScanResult
  resolveStrategy: 'skip' | 'keep_first' | 'keep_most_used'
  setResolveStrategy: (strategy: 'skip' | 'keep_first' | 'keep_most_used') => void
  migrating: boolean
  onBack: () => void
  onMigrate: () => void
}

export function MigrationScanReview({
  scanResult,
  resolveStrategy,
  setResolveStrategy,
  migrating,
  onBack,
  onMigrate,
}: MigrationScanReviewProps) {
  const t = useTranslations()
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('migrationScan.totalQuizzes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scanResult.total_quizzes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('migrationScan.totalQuestions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scanResult.total_questions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('migrationScan.uniqueQuestions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success-fg">{scanResult.unique_questions}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('migrationScan.ready')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('migrationScan.conflicts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{scanResult.conflicts}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('migrationScan.review')}</p>
          </CardContent>
        </Card>
      </div>

      {scanResult.conflicts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('migrationScan.resolution')}</CardTitle>
            <CardDescription>{t('migrationScan.chooseStrategy')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={resolveStrategy}
              onValueChange={(v: any) => setResolveStrategy(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">{t('migrationScan.skip')}</SelectItem>
                <SelectItem value="keep_first">{t('migrationScan.keepFirst')}</SelectItem>
                <SelectItem value="keep_most_used">{t('migrationScan.keepMostUsed')}</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {(scanResult.conflict_details?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('migrationScan.details', { count: scanResult.conflicts })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {scanResult.conflict_details?.slice(0, 10).map((conflict, idx) => (
                <ConflictPreview key={idx} conflict={conflict} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          {t('migrationScan.back')}
        </Button>
        <Button onClick={onMigrate} disabled={migrating} className="gap-2">
          {migrating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('migrationScan.migrating')}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {t('migrationScan.start')}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
