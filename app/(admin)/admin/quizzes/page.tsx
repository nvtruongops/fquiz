'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Input } from '@/components/shared/ui/input'
import { Switch } from '@/components/shared/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select'
import { Plus, Pencil, Search, Filter, MoreVertical, Trash2, Loader2 } from 'lucide-react'
import { invalidateHistoryForDeletedQuiz } from '@/lib/core/utils/cache-invalidation'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

const PAGE_SIZE = 20

interface Question {
  _id: string
  text: string
}

interface Quiz {
  _id: string
  title: string
  category_id: string
  course_code: string
  questionCount?: number
  questions: Question[]
  studentCount: number
  created_at: string
  status: 'published' | 'draft'
}

interface Category {
  _id: string
  name: string
}

async function fetchQuizzes(page: number, categoryId: string, search: string): Promise<{ quizzes: Quiz[], total: number }> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(PAGE_SIZE))
  if (categoryId && categoryId !== 'all') params.set('category_id', categoryId)
  if (search) params.set('search', search)
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/quizzes?${params.toString()}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch quizzes')
  return res.json()
}

async function fetchCategories(): Promise<{ categories: Category[] }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/categories`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

export default function AdminQuizzesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: quizData, isLoading: isQuizzesLoading } = useQuery({
    queryKey: ['admin', 'quizzes', page, categoryId, search],
    queryFn: () => fetchQuizzes(page, categoryId, search),
  })

  const { data: catData } = useQuery({
    queryKey: ['admin', 'categories', 'simple'],
    queryFn: fetchCategories,
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/quizzes/${id}`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'quizzes'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/quizzes/${id}`, { 
        method: 'DELETE', 
        credentials: 'include',
        headers: withCsrfHeaders(),
      })
      if (!res.ok) throw new Error('Failed to delete quiz')
      return res.json()
    },
    onSuccess: async (_, id) => {
      await invalidateHistoryForDeletedQuiz(queryClient, id)
      queryClient.invalidateQueries({ queryKey: ['admin', 'quizzes'] })
      setDeleteId(null)
    }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(deleteId)
    } finally {
      setIsDeleting(false)
    }
  }

  const categories = catData?.categories || []
  const quizzes = quizData?.quizzes || []
  const total = quizData?.total || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const categoryMap = new Map(categories.map(c => [c._id, c.name]))

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-primary">Quizzes</h1>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/admin/quizzes/new">
              <Plus className="h-4 w-4 mr-1" />
              New Quiz
            </Link>
          </Button>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8 border-border bg-muted/50 text-card-foreground">
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Tìm kiếm tiêu đề hoặc mã môn học..."
                className="pl-9 bg-card border-border text-card-foreground"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <div className="flex-1">
                <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
                  <SelectTrigger className="bg-card border-border text-card-foreground">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                      <SelectValue placeholder="Tất cả danh mục" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-popover-foreground">
                    <SelectItem value="all">Tất cả danh mục</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-end mb-4">
          <p className="text-sm text-muted-foreground">{total} quiz{total !== 1 ? 'zes' : ''} found</p>
        </div>

        {isQuizzesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse bg-muted border-border h-20" />
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <Card className="bg-card border-border text-card-foreground">
            <CardContent className="pt-6 text-muted-foreground text-center">
              No quizzes found matching your filters.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <Card key={String(quiz._id)} className="bg-card border-border hover:shadow-md transition-shadow overflow-visible text-card-foreground">
                <CardContent className="pt-5 pb-5 flex items-center justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                        {categoryMap.get(quiz.category_id) || 'Chưa phân loại'}
                      </span>
                      <Badge variant={quiz.status === 'published' ? 'default' : 'secondary'} 
                        className={`text-[9px] px-1.5 py-0 h-4 uppercase ${quiz.status === 'published' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground'}`}>
                        {quiz.status}
                      </Badge>
                    </div>

                    <div className="flex flex-col">
                      <p className="text-lg font-bold text-card-foreground leading-tight">
                        {quiz.title || quiz.course_code}
                      </p>
                      {quiz.title && quiz.course_code && quiz.title !== quiz.course_code && (
                        <span className="text-xs text-muted-foreground font-mono font-medium pt-0.5">
                          {quiz.course_code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium pt-1">
                      <span>{quiz.questionCount ?? quiz.questions?.length ?? 0} câu</span>
                      <div className="w-1 h-1 rounded-full bg-border" />
                      <span className="text-primary font-semibold">
                        {quiz.studentCount} lượt làm
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Show</span>
                       <Switch 
                        checked={quiz.status === 'published'} 
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: quiz._id, status: checked ? 'published' : 'draft' })}
                        disabled={toggleMutation.isPending}
                       />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-card-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32 border-border bg-popover text-popover-foreground">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/quizzes/${quiz._id}/edit`} className="flex items-center gap-2 cursor-pointer w-full">
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
                          onClick={() => setDeleteId(quiz._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination omitted for brevity, same as before */}
        {totalPages > 1 && (
          <div className="flex gap-2 mt-8 justify-center">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="border-border">Previous</Button>
            <div className="flex items-center gap-1 mx-2">
              <span className="text-sm font-bold text-primary">{page}</span>
              <span className="text-sm text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground">{totalPages}</span>
            </div>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="border-border">Next</Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-destructive">Xóa Quiz?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Hành động này không thể hoàn tác. Toàn bộ dữ liệu câu hỏi và lịch sử làm bài của sinh viên liên quan sẽ bị xóa vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting} className="border-border">Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
