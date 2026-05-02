'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/lib/store/toast-store'
import { getCsrfTokenFromCookie } from '@/lib/csrf'

interface Category {
  _id: string
  name: string
}

interface Conflict {
  question_id: string
  text: string
  total_variants: number
  answer_groups: Array<{
    correct_answer: number[]
    count: number
    quizzes: string[]
    sample_variant: {
      quiz_id: string
      course_code: string
      question_index: number
      options: string[]
      correct_answer: number[]
      explanation?: string
      image_url?: string
    }
  }>
}

interface QuestionBankConflictResolverProps {
  categories: Category[]
}

export function QuestionBankConflictResolver({
  categories,
}: QuestionBankConflictResolverProps) {
  const { toast } = useToast()
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null)
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0)
  const [updateAllQuizzes, setUpdateAllQuizzes] = useState(false)
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    if (selectedCategory) {
      fetchConflicts()
    }
  }, [selectedCategory])

  const fetchConflicts = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/question-bank/conflicts?category_id=${selectedCategory}`,
        { credentials: 'include' }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch conflicts')
      }

      const data = await response.json()
      setConflicts(data.conflicts || [])
    } catch (error) {
      console.error('Error fetching conflicts:', error)
      toast.error('Không thể tải danh sách conflicts')
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async () => {
    if (!selectedConflict || !selectedCategory) return

    const selectedGroup = selectedConflict.answer_groups[selectedVariantIndex]
    if (!selectedGroup) return

    setResolving(true)
    try {
      const csrfToken = getCsrfTokenFromCookie()
      
      const response = await fetch('/api/admin/question-bank/conflicts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          category_id: selectedCategory,
          question_id: selectedConflict.question_id,
          question_text: selectedConflict.text,        // ✅ Truyền text câu hỏi
          selected_variant: selectedGroup.sample_variant,
          update_quizzes: updateAllQuizzes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to resolve conflict')
      }

      const data = await response.json()
      toast.success(data.message || 'Đã resolve conflict thành công!')

      // Refresh conflicts list
      await fetchConflicts()
      setSelectedConflict(null)
      setSelectedVariantIndex(0)
      setUpdateAllQuizzes(false)
    } catch (error) {
      console.error('Error resolving conflict:', error)
      toast.error('Không thể resolve conflict')
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Giải quyết Conflicts
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Xem và chọn đáp án đúng cho các câu hỏi có mâu thuẫn
        </p>
      </div>

      {/* Category Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Chọn môn học</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* No Conflicts */}
      {!loading && selectedCategory && conflicts.length === 0 && (
        <Alert>
          <AlertDescription>
            Không có conflict nào trong môn học này!
          </AlertDescription>
        </Alert>
      )}

      {/* Conflicts List */}
      {!loading && conflicts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Conflict List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Danh sách Conflicts ({conflicts.length})</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchConflicts}
                >
                  Làm mới
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {conflicts.map((conflict) => (
                    <ConflictCard
                      key={conflict.question_id}
                      conflict={conflict}
                      selected={selectedConflict?.question_id === conflict.question_id}
                      onClick={() => {
                        setSelectedConflict(conflict)
                        setSelectedVariantIndex(0)
                      }}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right: Conflict Detail & Resolution */}
          <Card>
            <CardHeader>
              <CardTitle>Chi tiết & Giải quyết</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedConflict ? (
                <div className="space-y-6">
                  {/* Question Text */}
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      Câu hỏi:
                    </p>
                    <p className="font-medium text-gray-900">
                      {selectedConflict.text}
                    </p>
                  </div>

                  {/* Answer Variants */}
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-3">
                      Chọn đáp án đúng:
                    </p>
                    <div className="space-y-3">
                      {selectedConflict.answer_groups.map((group, idx) => (
                        <VariantCard
                          key={idx}
                          group={group}
                          selected={selectedVariantIndex === idx}
                          onClick={() => setSelectedVariantIndex(idx)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Checkbox
                      id="update-all"
                      checked={updateAllQuizzes}
                      onCheckedChange={(checked) =>
                        setUpdateAllQuizzes(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="update-all"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Cập nhật đáp án đúng cho tất cả quiz có câu hỏi này
                    </label>
                  </div>

                  {updateAllQuizzes && (
                    <Alert className="border-orange-300 bg-orange-50">
                      <AlertDescription className="text-xs text-orange-800 space-y-1">
                        <p className="font-bold"> Điều này sẽ xảy ra:</p>
                        <p>• Lưu đáp án đã chọn vào Ngân hàng câu hỏi</p>
                        <p>• Tìm tất cả quiz trong môn học có câu hỏi này</p>
                        <p>• Chỉ cập nhật <strong>đáp án đúng</strong> — options giữ nguyên của từng quiz</p>
                        <p>• Hành động này <strong>không thể hoàn tác!</strong></p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {!updateAllQuizzes && (
                    <p className="text-xs text-gray-500 px-1">
                      Nếu không tick, chỉ lưu vào Ngân hàng câu hỏi, các quiz giữ nguyên đáp án cũ.
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedConflict(null)}
                      className="flex-1"
                    >
                      Hủy
                    </Button>
                    <Button
                      onClick={handleResolve}
                      disabled={resolving}
                      className="flex-1"
                    >
                      {resolving ? 'Đang lưu...' : 'Lưu đáp án'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Chọn một conflict để xem chi tiết
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function ConflictCard({
  conflict,
  selected,
  onClick,
}: {
  conflict: Conflict
  selected: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        selected
          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="font-medium text-gray-900 text-sm line-clamp-2">
          {conflict.text}
        </p>
        <Badge variant="destructive" className="ml-2 shrink-0">
          {conflict.answer_groups.length} đáp án
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{conflict.total_variants} quiz</span>
        <span>•</span>
        <span>
          {conflict.answer_groups.reduce((sum, g) => sum + g.count, 0)} variants
        </span>
      </div>
    </div>
  )
}

function VariantCard({
  group,
  selected,
  onClick,
}: {
  group: {
    correct_answer: number[]
    count: number
    quizzes: string[]
    sample_variant: {
      options: string[]
      correct_answer: number[]
      explanation?: string
    }
  }
  selected: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        selected
          ? 'bg-green-50 border-green-300 ring-2 ring-green-500'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={selected ? 'default' : 'secondary'}>
            {group.count} quiz dùng đáp án này
          </Badge>
          {selected && <span className="text-green-600 font-bold text-sm">✓ Đã chọn</span>}
        </div>
      </div>

      {/* Options - highlight đáp án đúng */}
      <div className="space-y-1.5">
        {group.sample_variant.options.map((option, idx) => {
          const isCorrect = group.correct_answer.includes(idx)
          return (
            <div
              key={idx}
              className={`px-3 py-2 rounded border text-sm flex items-center gap-2 ${
                isCorrect
                  ? 'bg-green-100 border-green-400 font-semibold text-green-900'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1">{option}</span>
              {isCorrect && <span className="text-green-600 text-xs font-bold">✓</span>}
            </div>
          )
        })}
      </div>

      {/* Explanation */}
      {group.sample_variant.explanation && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500 mb-1 font-medium">Giải thích:</p>
          <p className="text-xs text-gray-700">{group.sample_variant.explanation}</p>
        </div>
      )}

      {/* Quizzes using this answer */}
      <div className="mt-3 pt-3 border-t">
        <p className="text-xs text-gray-500 mb-1 font-medium">
          Đáp án này đang dùng trong:
        </p>
        <div className="flex flex-wrap gap-1">
          {group.quizzes.slice(0, 5).map((code) => (
            <Badge key={code} variant="outline" className="text-[10px]">
              {code}
            </Badge>
          ))}
          {group.quizzes.length > 5 && (
            <Badge variant="outline" className="text-[10px]">
              +{group.quizzes.length - 5} khác
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
