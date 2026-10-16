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
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Quizzes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scanResult.total_quizzes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scanResult.total_questions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success-fg">{scanResult.unique_questions}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for immediate migration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conflicts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{scanResult.conflicts}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires review</p>
          </CardContent>
        </Card>
      </div>

      {scanResult.conflicts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conflict Resolution</CardTitle>
            <CardDescription>Choose how to handle questions with differing answers</CardDescription>
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
                <SelectItem value="skip">Skip - Only migrate non-conflicting questions</SelectItem>
                <SelectItem value="keep_first">Keep first encountered answer</SelectItem>
                <SelectItem value="keep_most_used">Keep most frequently used answer</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {(scanResult.conflict_details?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conflict Details ({scanResult.conflicts})</CardTitle>
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
          Back
        </Button>
        <Button onClick={onMigrate} disabled={migrating} className="gap-2">
          {migrating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Migrating...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Start Migration
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
