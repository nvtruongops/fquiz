import { useState } from 'react'
import { toast } from '@/hooks/useToast'

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
        headers: { 'Content-Type': 'application/json' },
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
      toast({ title: 'Thành công', description: 'Quét câu hỏi hoàn tất!', type: 'success' })
    } catch (error) {
      console.error('Scan error:', error)
      toast({ title: 'Lỗi', description: 'Không thể quét câu hỏi', type: 'error' })
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
        headers: { 'Content-Type': 'application/json' },
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
      toast({ title: 'Thành công', description: data.summary || 'Migration thành công!', type: 'success' })
      setStep('migrate')
    } catch (error) {
      console.error('Migration error:', error)
      toast({ title: 'Lỗi', description: 'Không thể migrate câu hỏi', type: 'error' })
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
