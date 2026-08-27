'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { useQuestionBankConflicts } from '@/hooks/question-bank/useQuestionBankConflicts'
import { ConflictCard } from './question-bank/conflicts/ConflictCard'
import { ConflictDetailPanel } from './question-bank/conflicts/ConflictDetailPanel'

interface Category {
  _id: string
  name: string
}

interface QuestionBankConflictResolverProps {
  categories: Category[]
}

export function QuestionBankConflictResolver({ categories }: QuestionBankConflictResolverProps) {
  const {
    selectedCategory,
    setSelectedCategory,
    loading,
    conflicts,
    selectedConflict,
    setSelectedConflict,
    selectedVariantIndex,
    setSelectedVariantIndex,
    updateAllQuizzes,
    setUpdateAllQuizzes,
    resolving,
    fetchConflicts,
    handleResolve,
  } = useQuestionBankConflicts('all')

  return (
    <div className="space-y-6 text-card-foreground">
      <div>
        <h2 className="text-2xl font-bold text-card-foreground">Giải quyết Conflicts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Xem và chọn đáp án đúng cho các câu hỏi có mâu thuẫn
        </p>
      </div>

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
              <SelectItem value="all">Tất cả môn học</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat._id} value={cat._id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && selectedCategory && conflicts.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Không có conflict nào trong môn học này!
          </CardContent>
        </Card>
      )}

      {!loading && conflicts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Danh sách Conflicts ({conflicts.length})</CardTitle>
                <Button size="sm" variant="outline" onClick={fetchConflicts}>
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

          <ConflictDetailPanel
            selectedConflict={selectedConflict}
            selectedVariantIndex={selectedVariantIndex}
            setSelectedVariantIndex={setSelectedVariantIndex}
            updateAllQuizzes={updateAllQuizzes}
            setUpdateAllQuizzes={setUpdateAllQuizzes}
            resolving={resolving}
            onCancel={() => setSelectedConflict(null)}
            onResolve={handleResolve}
          />
        </div>
      )}
    </div>
  )
}
