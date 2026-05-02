'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Plus, TrendingUp, Loader2 } from 'lucide-react'
import { useToast } from '@/lib/store/toast-store'

interface QuestionBankItem {
  _id: string
  question_id: string
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string
  usage_count: number
  used_in_quizzes: string[]
}

interface QuestionBankBrowserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryId: string
  onSelectQuestion: (question: Omit<QuestionBankItem, '_id' | 'question_id' | 'usage_count' | 'used_in_quizzes'>) => void
}

export function QuestionBankBrowser({
  open,
  onOpenChange,
  categoryId,
  onSelectQuestion,
}: QuestionBankBrowserProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<QuestionBankItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'popular' | 'recent'>('popular')

  useEffect(() => {
    if (open && categoryId) {
      fetchQuestions()
    }
  }, [open, categoryId, sortBy])

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/question-bank/list?category_id=${categoryId}&sort=${sortBy}&limit=50`,
        {
          credentials: 'include',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch questions')
      }

      const data = await response.json()
      setQuestions(data.questions || [])
    } catch (error) {
      console.error('Error fetching question bank:', error)
      toast.error('Không thể tải ngân hàng câu hỏi')
    } finally {
      setLoading(false)
    }
  }

  const filteredQuestions = questions.filter((q) =>
    q.text.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectQuestion = (question: QuestionBankItem) => {
    onSelectQuestion({
      text: question.text,
      options: question.options,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      image_url: question.image_url,
    })
    toast.success('Đã thêm câu hỏi từ ngân hàng')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Ngân hàng câu hỏi môn học</DialogTitle>
          <DialogDescription>
            Chọn câu hỏi đã có để tái sử dụng trong quiz mới
          </DialogDescription>
        </DialogHeader>

        {/* Search & Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'popular' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('popular')}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Phổ biến
            </Button>
            <Button
              variant={sortBy === 'recent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('recent')}
            >
              Mới nhất
            </Button>
          </div>
        </div>

        {/* Questions List */}
        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? 'Không tìm thấy câu hỏi phù hợp' : 'Chưa có câu hỏi trong ngân hàng'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((question) => (
                <QuestionCard
                  key={question._id}
                  question={question}
                  onSelect={() => handleSelectQuestion(question)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function QuestionCard({
  question,
  onSelect,
}: {
  question: QuestionBankItem
  onSelect: () => void
}) {
  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <p className="font-medium text-gray-900 mb-2">{question.text}</p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Dùng {question.usage_count} lần
            </Badge>
            {question.correct_answer.length > 1 && (
              <Badge variant="outline" className="text-xs">
                Đa đáp án
              </Badge>
            )}
          </div>
        </div>
        <Button size="sm" onClick={onSelect} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Thêm
        </Button>
      </div>

      {/* Options Preview */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {question.options.slice(0, 4).map((option, idx) => {
          const isCorrect = question.correct_answer.includes(idx)
          return (
            <div
              key={idx}
              className={`p-2 rounded border text-xs ${
                isCorrect
                  ? 'bg-green-50 border-green-300 font-medium'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              {String.fromCharCode(65 + idx)}. {option}
            </div>
          )
        })}
      </div>

      {/* Used in quizzes */}
      {question.used_in_quizzes.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500 mb-1">Đã dùng trong:</p>
          <div className="flex flex-wrap gap-1">
            {question.used_in_quizzes.slice(0, 3).map((code) => (
              <Badge key={code} variant="outline" className="text-[10px]">
                {code}
              </Badge>
            ))}
            {question.used_in_quizzes.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{question.used_in_quizzes.length - 3}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
