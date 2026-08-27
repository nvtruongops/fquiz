'use client'

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
import { Scan, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { useQuestionBankMigration } from '@/hooks/question-bank/useQuestionBankMigration'
import { StepIndicator } from './question-bank/migration/StepIndicator'
import { MigrationScanReview } from './question-bank/migration/MigrationScanReview'

interface Category {
  _id: string
  name: string
}

interface QuestionBankMigrationProps {
  categories: Category[]
}

export function QuestionBankMigration({ categories }: QuestionBankMigrationProps) {
  const {
    selectedCategory,
    setSelectedCategory,
    step,
    setStep,
    scanning,
    migrating,
    scanResult,
    setScanResult,
    resolveStrategy,
    setResolveStrategy,
    handleScan,
    handleMigrate,
    reset,
  } = useQuestionBankMigration(categories[0]?._id || '')

  const selectedCategoryName = categories.find((c) => c._id === selectedCategory)?.name

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-card-foreground">Migration Ngân hàng Câu hỏi</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Quét và migrate câu hỏi từ các quiz hiện có vào ngân hàng môn học
        </p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <StepIndicator
          number={1}
          label="Chọn môn"
          active={step === 'select'}
          completed={['scan', 'review', 'migrate'].includes(step)}
        />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <StepIndicator
          number={2}
          label="Quét"
          active={step === 'scan'}
          completed={['review', 'migrate'].includes(step)}
        />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <StepIndicator
          number={3}
          label="Xem xét"
          active={step === 'review'}
          completed={step === 'migrate'}
        />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <StepIndicator number={4} label="Migrate" active={step === 'migrate'} completed={false} />
      </div>

      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 1: Chọn môn học</CardTitle>
            <CardDescription>Chọn môn học để quét và migrate câu hỏi vào ngân hàng</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="-- Chọn môn học --" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat._id} value={cat._id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => {
                setStep('scan')
                handleScan()
              }}
              disabled={!selectedCategory || scanning}
              className="w-full gap-2"
            >
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang quét...
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4" />
                  Quét câu hỏi
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'scan' && scanning && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Đang quét câu hỏi...</p>
              <p className="text-sm text-muted-foreground">Môn học: {selectedCategoryName}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'review' && scanResult && (
        <MigrationScanReview
          scanResult={scanResult}
          resolveStrategy={resolveStrategy}
          setResolveStrategy={setResolveStrategy}
          migrating={migrating}
          onBack={() => {
            setStep('select')
            setScanResult(null)
          }}
          onMigrate={handleMigrate}
        />
      )}

      {step === 'migrate' && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <CheckCircle2 className="h-16 w-16 text-success-fg" />
              <p className="text-2xl font-bold">Migration hoàn tất!</p>
              <p className="text-muted-foreground">Câu hỏi đã được thêm vào ngân hàng môn học</p>
              <Button onClick={reset}>Migrate môn học khác</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
