import { useState } from 'react'
import { toast } from '@/hooks/useToast'
import { useTranslations } from '@fquiz/ui/i18n'
import { withCsrfHeaders } from '@/lib/security/csrf'

export interface ScanResult {
  total_quizzes: number
  total_questions: number
  unique_questions: number
  conflicts: number
  conflict_details: Array<{
    question_id: string
    text: string
    variant_count: number
    variants: Array<{
      course_code: string
      correct_answer: number[]
      options: string[]
    }>
  }>
}

export function useQuestionBankMigration(initialCategoryId: string = '') {
  const t = useTranslations()
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryId)
  const [step, setStep] = useState<'select' | 'scan' | 'review' | 'migrate'>('select')
  const [scanning, setScanning] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [resolveStrategy, setResolveStrategy] = useState<'skip' | 'keep_first' | 'keep_most_used'>('skip')

  const handleScan = async () => {
    if (!selectedCategory) return

    setScanning(true)
    try {
      const response = await fetch('/api/question-bank/migrate', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          category_id: selectedCategory,
          mode: 'scan',
        }),
      })

      if (!response.ok) {
        throw new Error('Scan failed')
      }

      const data = await response.json()
      setScanResult(data)
      setStep('review')
      toast({ title: t('toast.success'), description: t('admin.scanCompleted'), type: 'success' })
    } catch (error) {
      console.error('Scan error:', error)
      toast({ title: t('toast.error'), description: t('admin.scanFailed'), type: 'error' })
    } finally {
      setScanning(false)
    }
  }

  const handleMigrate = async () => {
    if (!selectedCategory || !scanResult) return

    setMigrating(true)
    try {
      const response = await fetch('/api/question-bank/migrate', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          category_id: selectedCategory,
          mode: 'migrate',
          resolve_conflicts: resolveStrategy,
        }),
      })

      if (!response.ok) {
        throw new Error('Migration failed')
      }

      const data = await response.json()
      toast({ title: t('toast.success'), description: data.summary || t('admin.migrationCompleted'), type: 'success' })
      setStep('migrate')
    } catch (error) {
      console.error('Migration error:', error)
      toast({ title: t('toast.error'), description: t('admin.migrationFailed'), type: 'error' })
    } finally {
      setMigrating(false)
    }
  }

  const reset = () => {
    setStep('select')
    setScanResult(null)
    setSelectedCategory('')
  }

  return {
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
  }
}
