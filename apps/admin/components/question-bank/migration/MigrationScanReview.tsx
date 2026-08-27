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
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng Quiz</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scanResult.total_quizzes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng câu hỏi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scanResult.total_questions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Câu duy nhất</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success-fg">{scanResult.unique_questions}</div>
            <p className="text-xs text-muted-foreground mt-1">Có thể migrate ngay</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conflicts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{scanResult.conflicts}</div>
            <p className="text-xs text-muted-foreground mt-1">Cần xem xét</p>
          </CardContent>
        </Card>
      </div>

      {scanResult.conflicts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Xử lý Conflicts</CardTitle>
            <CardDescription>Chọn cách xử lý các câu hỏi có đáp án khác nhau</CardDescription>
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
                <SelectItem value="skip">Bỏ qua - Chỉ migrate câu không conflict</SelectItem>
                <SelectItem value="keep_first">Giữ đáp án đầu tiên gặp</SelectItem>
                <SelectItem value="keep_most_used">Giữ đáp án xuất hiện nhiều nhất</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {(scanResult.conflict_details?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết Conflicts ({scanResult.conflicts})</CardTitle>
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
          Quay lại
        </Button>
        <Button onClick={onMigrate} disabled={migrating} className="gap-2">
          {migrating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang migrate...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Bắt đầu Migration
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
