import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { Trash2, Loader2, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import type { Quiz } from '@/hooks/quizzes/useAdminQuizzes'

interface QuizTableProps {
  isLoading: boolean
  data?: { quizzes: Quiz[]; total: number }
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onUpdateStatus: (id: string, status: string) => void
  onDeleteTarget: (quiz: Quiz) => void
}

export function QuizTable({
  isLoading,
  data,
  page,
  totalPages,
  onPageChange,
  onUpdateStatus,
  onDeleteTarget,
}: QuizTableProps) {
  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
            </div>
          ) : !data || data.quizzes.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No quizzes found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Quiz Code</th>
                    <th className="text-left py-3 px-4 font-semibold">Title</th>
                    <th className="text-left py-3 px-4 font-semibold">Questions</th>
                    <th className="text-left py-3 px-4 font-semibold">Attempts</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Created Date</th>
                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.quizzes.map((q) => (
                    <tr key={q._id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">{q.course_code}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{q.title}</td>
                      <td className="py-3 px-4 text-muted-foreground">{q.questionCount ?? 0}</td>
                      <td className="py-3 px-4 text-muted-foreground">{q.studentCount ?? 0}</td>
                      <td className="py-3 px-4">
                        <Select
                          value={q.status}
                          onValueChange={(status) => onUpdateStatus(q._id, status)}
                        >
                          <SelectTrigger className="h-8 w-28 text-xs font-semibold" aria-label={`Change status for ${q.course_code}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(q.created_at).toLocaleDateString('en-US')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/quizzes/${q._id}/edit`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-muted-foreground hover:text-primary cursor-pointer"
                              title="Edit quiz"
                              aria-label={`Edit quiz ${q.course_code}`}
                            >
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteTarget(q)}
                            className="h-8 px-2 text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Delete quiz"
                            aria-label={`Delete quiz ${q.course_code}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{data.total}</span> {data.total === 1 ? 'quiz' : 'quizzes'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
            <span className="text-xs font-medium px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
