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
        <h2 className="text-2xl font-bold text-card-foreground">Question Bank Migration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Scan and migrate questions from existing quizzes into the Question Bank
        </p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <StepIndicator
          number={1}
          label="Select"
          active={step === 'select'}
          completed={['scan', 'review', 'migrate'].includes(step)}
        />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <StepIndicator
          number={2}
          label="Scan"
          active={step === 'scan'}
          completed={['review', 'migrate'].includes(step)}
        />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <StepIndicator
          number={3}
          label="Review"
          active={step === 'review'}
          completed={step === 'migrate'}
        />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <StepIndicator number={4} label="Migrate" active={step === 'migrate'} completed={false} />
      </div>

      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Category</CardTitle>
            <CardDescription>Select a category to scan and migrate questions into the Question Bank</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="-- Select category --" />
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
                  Scanning...
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4" />
                  Scan Questions
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
              <p className="text-lg font-medium">Scanning questions...</p>
              <p className="text-sm text-muted-foreground">Category: {selectedCategoryName}</p>
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
              <p className="text-2xl font-bold">Migration Completed!</p>
              <p className="text-muted-foreground">Questions have been successfully migrated into the Question Bank</p>
              <Button onClick={reset}>Migrate Another Category</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
