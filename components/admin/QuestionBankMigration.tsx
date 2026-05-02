'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Scan,
  Upload,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { useToast } from '@/lib/store/toast-store'
import { getCsrfTokenFromCookie } from '@/lib/csrf'

interface Category {
  _id: string
  name: string
}

interface ScanResult {
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

interface QuestionBankMigrationProps {
  categories: Category[]
}

export function QuestionBankMigration({ categories }: QuestionBankMigrationProps) {
  const { toast } = useToast()
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [step, setStep] = useState<'select' | 'scan' | 'review' | 'migrate'>('select')
  const [scanning, setScanning] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [resolveStrategy, setResolveStrategy] = useState<'skip' | 'keep_first' | 'keep_most_used'>('skip')

  const handleScan = async () => {
    if (!selectedCategory) return

    setScanning(true)
    try {
      const csrfToken = getCsrfTokenFromCookie()
      
      const response = await fetch('/api/admin/question-bank/migrate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          category_id: selectedCategory,
          mode: 'scan',
        }),
      })

      if (response.status === 403) {
        const errorData = await response.json()
        console.error('Access denied:', errorData)
        
        if (errorData.error === 'Invalid or missing CSRF token') {
          toast.error('Lỗi bảo mật: Vui lòng tải lại trang')
        } else {
          toast.error('Bạn cần quyền Admin để sử dụng tính năng này')
        }
        return
      }

      if (!response.ok) {
        throw new Error('Scan failed')
      }

      const data = await response.json()
      setScanResult(data)
      setStep('review')
      toast.success('Quét thành công!')
    } catch (error) {
      console.error('Scan error:', error)
      toast.error('Không thể quét câu hỏi')
    } finally {
      setScanning(false)
    }
  }

  const handleMigrate = async () => {
    if (!selectedCategory || !scanResult) return

    setMigrating(true)
    try {
      const csrfToken = getCsrfTokenFromCookie()
      
      const response = await fetch('/api/admin/question-bank/migrate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
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
      toast.success(data.summary || 'Migration thành công!')
      setStep('migrate')
    } catch (error) {
      console.error('Migration error:', error)
      toast.error('Không thể migrate câu hỏi')
    } finally {
      setMigrating(false)
    }
  }

  const selectedCategoryName = categories.find((c) => c._id === selectedCategory)?.name

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Migration Ngân hàng Câu hỏi
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Quét và migrate câu hỏi từ các quiz hiện có vào ngân hàng môn học
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        <StepIndicator
          number={1}
          label="Chọn môn"
          active={step === 'select'}
          completed={['scan', 'review', 'migrate'].includes(step)}
        />
        <ArrowRight className="h-4 w-4 text-gray-400" />
        <StepIndicator
          number={2}
          label="Quét"
          active={step === 'scan'}
          completed={['review', 'migrate'].includes(step)}
        />
        <ArrowRight className="h-4 w-4 text-gray-400" />
        <StepIndicator
          number={3}
          label="Xem xét"
          active={step === 'review'}
          completed={step === 'migrate'}
        />
        <ArrowRight className="h-4 w-4 text-gray-400" />
        <StepIndicator number={4} label="Migrate" active={step === 'migrate'} completed={false} />
      </div>

      {/* Step 1: Select Category */}
      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 1: Chọn môn học</CardTitle>
            <CardDescription>
              Chọn môn học để quét và migrate câu hỏi vào ngân hàng
            </CardDescription>
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

      {/* Step 2: Scanning */}
      {step === 'scan' && scanning && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-lg font-medium">Đang quét câu hỏi...</p>
              <p className="text-sm text-gray-500">
                Môn học: {selectedCategoryName}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review Results */}
      {step === 'review' && scanResult && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Tổng Quiz
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{scanResult.total_quizzes}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Tổng câu hỏi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{scanResult.total_questions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Câu duy nhất
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {scanResult.unique_questions}
                </div>
                <p className="text-xs text-gray-500 mt-1">Có thể migrate ngay</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Conflicts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {scanResult.conflicts}
                </div>
                <p className="text-xs text-gray-500 mt-1">Cần xem xét</p>
              </CardContent>
            </Card>
          </div>

          {/* Conflict Strategy */}
          {scanResult.conflicts > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Xử lý Conflicts</CardTitle>
                <CardDescription>
                  Chọn cách xử lý các câu hỏi có đáp án khác nhau
                </CardDescription>
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
                    <SelectItem value="skip">
                      Bỏ qua - Chỉ migrate câu không conflict
                    </SelectItem>
                    <SelectItem value="keep_first">
                      Giữ đáp án đầu tiên gặp
                    </SelectItem>
                    <SelectItem value="keep_most_used">
                      Giữ đáp án xuất hiện nhiều nhất
                    </SelectItem>
                  </SelectContent>
                </Select>

                {resolveStrategy !== 'skip' && (
                  <Alert>
                    <AlertDescription>
                      Lưu ý: Các câu hỏi conflict sẽ được đánh dấu trong ngân hàng.
                      Bạn có thể xem và chỉnh sửa sau.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Conflict Details */}
          {scanResult.conflict_details.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết Conflicts ({scanResult.conflicts})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {scanResult.conflict_details.slice(0, 10).map((conflict, idx) => (
                    <ConflictPreview key={idx} conflict={conflict} />
                  ))}
                  {scanResult.conflict_details.length > 10 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      ... và {scanResult.conflict_details.length - 10} conflicts khác
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setStep('select')
                setScanResult(null)
              }}
            >
              Quay lại
            </Button>
            <Button onClick={handleMigrate} disabled={migrating} className="gap-2">
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
      )}

      {/* Step 4: Migration Complete */}
      {step === 'migrate' && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
              <p className="text-2xl font-bold">Migration hoàn tất!</p>
              <p className="text-gray-500">
                Câu hỏi đã được thêm vào ngân hàng môn học
              </p>
              <Button
                onClick={() => {
                  setStep('select')
                  setScanResult(null)
                  setSelectedCategory('')
                }}
              >
                Migrate môn học khác
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
          completed
            ? 'bg-green-600 text-white'
            : active
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-600'
        }`}
      >
        {completed ? '✓' : number}
      </div>
      <span
        className={`text-sm font-medium ${
          active ? 'text-gray-900' : 'text-gray-500'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

function ConflictPreview({
  conflict,
}: {
  conflict: {
    question_id: string
    text: string
    variant_count: number
    variants: Array<{
      course_code: string
      correct_answer: number[]
      options: string[]
    }>
  }
}) {
  return (
    <div className="border rounded-lg p-4 bg-red-50 border-red-200">
      <div className="flex items-start justify-between mb-2">
        <p className="font-medium text-gray-900">{conflict.text}</p>
        <Badge variant="destructive">{conflict.variant_count} variants</Badge>
      </div>

      <div className="space-y-2 mt-3">
        {conflict.variants.slice(0, 3).map((variant, idx) => (
          <div key={idx} className="text-sm">
            <span className="font-medium text-gray-700">{variant.course_code}:</span>{' '}
            <span className="text-gray-600">
              Đáp án:{' '}
              {variant.correct_answer.map((i) => variant.options[i]).join(', ')}
            </span>
          </div>
        ))}
        {conflict.variants.length > 3 && (
          <p className="text-xs text-gray-500">
            +{conflict.variants.length - 3} variants khác
          </p>
        )}
      </div>
    </div>
  )
}
