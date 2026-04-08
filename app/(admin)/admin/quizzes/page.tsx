'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Search, Filter, MoreVertical, Trash2, Loader2 } from 'lucide-react'
import { invalidateHistoryForDeletedQuiz } from '@/lib/cache-invalidation'

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
  
  const res = await fetch(`/api/admin/quizzes?${params.toString()}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch quizzes')
  return res.json()
}

async function fetchCategories(): Promise<{ categories: Category[] }> {
  const res = await fetch('/api/admin/categories', { credentials: 'include' })
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
      const res = await fetch(`/api/admin/quizzes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`/api/admin/quizzes/${id}`, { method: 'DELETE' })
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
          <h1 className="text-2xl font-bold text-[#5D7B6F]">Quizzes</h1>
          <Button asChild className="bg-[#5D7B6F] hover:bg-[#5D7B6F]/90">
            <Link href="/admin/quizzes/new">
              <Plus className="h-4 w-4 mr-1" />
              New Quiz
            </Link>
          </Button>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8 border-[#D7F9FA] bg-[#D7F9FA]/10">
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Tìm kiếm tiêu đề hoặc mã môn học..."
                className="pl-9 bg-white"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <div className="flex-1">
                <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
                  <SelectTrigger className="bg-white">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-gray-400" />
                      <SelectValue placeholder="Tất cả danh mục" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
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
          <p className="text-sm text-gray-500">{total} quiz{total !== 1 ? 'zes' : ''} found</p>
        </div>

        {isQuizzesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse bg-gray-50 border-gray-100 h-20" />
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <Card className="bg-white border-[#A4C3A2]">
            <CardContent className="pt-6 text-gray-500 text-center">
              No quizzes found matching your filters.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <Card key={String(quiz._id)} className="bg-white border-[#A4C3A2] hover:shadow-md transition-shadow overflow-visible">
                <CardContent className="pt-5 pb-5 flex items-center justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-[#5D7B6F]">
                        {categoryMap.get(quiz.category_id) || 'Chưa phân loại'}
                      </span>
                      <Badge variant={quiz.status === 'published' ? 'default' : 'secondary'} 
                        className={`text-[9px] px-1.5 py-0 h-4 uppercase ${quiz.status === 'published' ? 'bg-[#5D7B6F] hover:bg-[#5D7B6F]' : 'bg-gray-400'}`}>
                        {quiz.status}
                      </Badge>
                    </div>

                    <div className="flex flex-col">
                      <p className="text-lg font-bold text-gray-900 leading-tight">
                        {quiz.course_code}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 font-medium pt-1">
                      <span>{quiz.questionCount ?? quiz.questions?.length ?? 0} câu</span>
                      <div className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-[#5D7B6F] font-semibold">
                        {quiz.studentCount} lượt làm
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Show</span>
                       <Switch 
                        checked={quiz.status === 'published'} 
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: quiz._id, status: checked ? 'published' : 'draft' })}
                        disabled={toggleMutation.isPending}
                       />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/quizzes/${quiz._id}/edit`} className="flex items-center gap-2 cursor-pointer w-full">
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600 flex items-center gap-2 cursor-pointer"
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
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <div className="flex items-center gap-1 mx-2">
              <span className="text-sm font-bold text-[#5D7B6F]">{page}</span>
              <span className="text-sm text-gray-400">/</span>
              <span className="text-sm text-gray-400">{totalPages}</span>
            </div>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa Quiz?</DialogTitle>
            <DialogDescription>
              Hành động này không thể hoàn tác. Toàn bộ dữ liệu câu hỏi và lịch sử làm bài của sinh viên liên quan sẽ bị xóa vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
