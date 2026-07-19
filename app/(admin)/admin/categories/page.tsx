'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/shared/ui/dialog'
import { Pencil, Trash2, Search } from 'lucide-react'

import { useToast } from '@/store/shared/toast-store'
import { normalizeSearchInput, sanitizeQueryParams } from '@/lib/core/validation/client-validation'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

interface Category {
  _id: string
  name: string
  quizCount: number
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
  type: 'private' | 'public'
}

interface Topic {
  _id: string
  name: string
  slug: string
  path: string
  parentTopicId?: string | null
  status: string
}

interface TextGenreItem {
  _id: string
  name: string
  code: string
  icon?: string
  description?: string
  defaultTone?: string
  status: string
}

// APIs
async function fetchCategories(search = '', status = 'approved'): Promise<{ categories: Category[] }> {
  const normalizedSearch = normalizeSearchInput(search, 200)
  const validStatus = ['pending', 'approved', 'rejected', ''].includes(status) ? status : 'approved'

  const queryParams = sanitizeQueryParams({
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...(validStatus ? { status: validStatus } : {}),
    type: 'public',
  })

  const params = new URLSearchParams(queryParams)
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/categories?${params.toString()}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

async function createCategory(name: string): Promise<{ category: Category }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/categories`, {
    method: 'POST',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Failed to create category')
  }
  return res.json()
}

async function updateCategory(id: string, name: string): Promise<{ category: Category }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/categories/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Failed to update category')
  }
  return res.json()
}

async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/categories/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: withCsrfHeaders(),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Failed to delete category')
  }
}

async function fetchAdminTopics(): Promise<{ topics: Topic[] }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/topics`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch topics')
  return res.json()
}

async function createAdminTopic(data: { name: string; slug?: string }): Promise<{ topic: Topic }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/topics`, {
    method: 'POST',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Failed to create topic')
  }
  return res.json()
}

async function updateAdminTopic(id: string, data: { name: string; slug?: string }): Promise<{ topic: Topic }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/topics/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Failed to update topic')
  }
  return res.json()
}

async function deleteAdminTopic(id: string): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/topics/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: withCsrfHeaders(),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Failed to delete topic')
  }
}

async function fetchAdminGenres(): Promise<{ genres: TextGenreItem[] }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/genres`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch genres')
  return res.json()
}

async function createAdminGenre(data: { name: string; description?: string }): Promise<{ genre: TextGenreItem }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/genres`, {
    method: 'POST',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Failed to create genre')
  }
  return res.json()
}

async function deleteAdminGenre(id: string): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/genres/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: withCsrfHeaders(),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Failed to delete genre')
  }
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // 2 MAIN TABS: 'ai_learning' vs 'quiz_exam'
  const [mainTab, setMainTab] = useState<'ai_learning' | 'quiz_exam'>('ai_learning')

  // INSIDE AI LEARNING: 2 SUB-TABS: 'topic' vs 'genre'
  const [aiSubTab, setAiSubTab] = useState<'topic' | 'genre'>('topic')

  // Quiz Category states
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [search, setSearch] = useState('')

  // Topic states (Name + Slug ONLY)
  const [topicName, setTopicName] = useState('')
  const [topicSlug, setTopicSlug] = useState('')

  const [editTopicId, setEditTopicId] = useState<string | null>(null)
  const [editTopicName, setEditTopicName] = useState('')
  const [editTopicSlug, setEditTopicSlug] = useState('')
  const [deleteTopicTarget, setDeleteTopicTarget] = useState<Topic | null>(null)

  // Genre states
  const [genreName, setGenreName] = useState('')
  const [genreDesc, setGenreDesc] = useState('')
  const [deleteGenreTarget, setDeleteGenreTarget] = useState<TextGenreItem | null>(null)

  // Queries
  const { data: categoryData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['admin', 'categories', search],
    queryFn: () => fetchCategories(search, 'approved'),
    enabled: mainTab === 'quiz_exam',
  })

  const { data: topicData, isLoading: isTopicsLoading } = useQuery({
    queryKey: ['admin', 'topics'],
    queryFn: fetchAdminTopics,
    enabled: mainTab === 'ai_learning',
  })

  const { data: genreData, isLoading: isGenresLoading } = useQuery({
    queryKey: ['admin', 'genres'],
    queryFn: fetchAdminGenres,
    enabled: mainTab === 'ai_learning',
  })

  const publicCategories = (categoryData?.categories ?? []).filter((cat) => cat.type === 'public')
  const topics = topicData?.topics ?? []
  const genres = genreData?.genres ?? []

  // Quiz Mutations
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setNewName('')
      toast.success('Đã thêm danh mục mới')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateCategory(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setEditId(null)
      setEditName('')
      toast.success('Đã cập nhật danh mục')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setDeleteTarget(null)
      toast.success('Đã xóa danh mục')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Topic Mutations
  const createTopicMutation = useMutation({
    mutationFn: createAdminTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'topics'] })
      setTopicName('')
      setTopicSlug('')
      toast.success('Đã thêm chủ đề mới')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateTopicMutation = useMutation({
    mutationFn: ({ id, name, slug }: { id: string; name: string; slug?: string }) => updateAdminTopic(id, { name, slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'topics'] })
      setEditTopicId(null)
      setEditTopicName('')
      setEditTopicSlug('')
      toast.success('Đã cập nhật chủ đề')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteTopicMutation = useMutation({
    mutationFn: deleteAdminTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'topics'] })
      setDeleteTopicTarget(null)
      toast.success('Đã xóa chủ đề')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Genre Mutations
  const createGenreMutation = useMutation({
    mutationFn: createAdminGenre,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'genres'] })
      setGenreName('')
      setGenreDesc('')
      toast.success('Đã thêm thể loại văn bản mới')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteGenreMutation = useMutation({
    mutationFn: deleteAdminGenre,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'genres'] })
      setDeleteGenreTarget(null)
      toast.success('Đã xóa thể loại văn bản')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden flex flex-col p-6 max-w-7xl mx-auto space-y-4">
      {/* Header (Compact) */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-[#5D7B6F]">Quản Lý Danh Mục</h1>
          <p className="text-xs font-medium text-gray-500">
            Quản lý danh mục học ngôn ngữ và đề thi
          </p>
        </div>
      </div>

      {/* 2 MAIN TABS: COMPACT PLAIN TEXT */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200/80 rounded-2xl shrink-0">
        <button
          type="button"
          onClick={() => setMainTab('ai_learning')}
          className={`py-2.5 px-4 rounded-xl font-black text-sm transition-all duration-200 ${
            mainTab === 'ai_learning'
              ? 'bg-[#5D7B6F] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/50 font-bold'
          }`}
        >
          Học Ngôn Ngữ AI
        </button>

        <button
          type="button"
          onClick={() => setMainTab('quiz_exam')}
          className={`py-2.5 px-4 rounded-xl font-black text-sm transition-all duration-200 ${
            mainTab === 'quiz_exam'
              ? 'bg-[#5D7B6F] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-white/50 font-bold'
          }`}
        >
          Đề Thi Quiz
        </button>
      </div>

      {/* MAIN TAB 1: HỌC NGÔN NGỮ AI */}
      {mainTab === 'ai_learning' && (
        <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
          {/* 2 SUB-TABS */}
          <div className="flex items-center gap-2 p-1 bg-white rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setAiSubTab('topic')}
              className={`flex-1 py-2 px-3 rounded-lg font-black text-xs transition-all ${
                aiSubTab === 'topic'
                  ? 'bg-[#5D7B6F] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 font-bold'
              }`}
            >
              Chủ Đề ({topics.length})
            </button>

            <button
              type="button"
              onClick={() => setAiSubTab('genre')}
              className={`flex-1 py-2 px-3 rounded-lg font-black text-xs transition-all ${
                aiSubTab === 'genre'
                  ? 'bg-[#5D7B6F] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 font-bold'
              }`}
            >
              Thể Loại Văn Bản ({genres.length})
            </button>
          </div>

          {/* SUB-TAB 1: CHỦ ĐỀ (Name + Slug ONLY) */}
          {aiSubTab === 'topic' && (
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Form Create Topic */}
              <Card className="md:col-span-1 flex flex-col justify-between bg-white border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <CardHeader className="py-3 px-4 border-b border-slate-100 shrink-0">
                  <CardTitle className="text-[#5D7B6F] text-base font-black">
                    Thêm Chủ Đề Mới
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-1 flex flex-col justify-between">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (topicName.trim()) createTopicMutation.mutate({ name: topicName.trim(), slug: topicSlug.trim() })
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Tên Chủ Đề</label>
                      <Input
                        value={topicName}
                        onChange={(e) => setTopicName(e.target.value)}
                        placeholder="VD: Du Lịch & Khách Sạn..."
                        className="rounded-xl py-4 border-slate-200 font-medium text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Mã Slug (Mã định danh URL / DB)</label>
                      <Input
                        value={topicSlug}
                        onChange={(e) => setTopicSlug(e.target.value)}
                        placeholder="VD: travel-hotel (để trống sẽ tự tạo)"
                        className="rounded-xl py-4 border-slate-200 font-mono text-xs"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={createTopicMutation.isPending || !topicName.trim()}
                      className="w-full bg-[#5D7B6F] hover:bg-[#4a6358] py-5 rounded-xl font-bold text-sm mt-2"
                    >
                      Thêm Chủ Đề
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Topics List */}
              <Card className="md:col-span-2 flex flex-col bg-white border-slate-200 rounded-2xl shadow-xs overflow-hidden h-full">
                <CardHeader className="py-3 px-4 border-b border-slate-100 shrink-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-[#5D7B6F] text-base font-black">
                    Danh Sách Chủ Đề & Slug
                  </CardTitle>
                  <span className="text-xs font-bold text-gray-400">{topics.length} mục</span>
                </CardHeader>
                <CardContent className="p-3 flex-1 min-h-0 overflow-hidden">
                  {isTopicsLoading ? (
                    <div className="p-8 text-center text-gray-400 italic text-sm">Đang tải danh sách...</div>
                  ) : topics.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-medium italic text-sm">
                      Chưa có chủ đề nào.
                    </div>
                  ) : (
                    <ul className="space-y-2.5 h-full overflow-y-auto pr-1">
                      {topics.map((tp) => (
                        <li
                          key={tp._id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-[#5D7B6F]/30 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <p className="font-black text-slate-900 text-sm">{tp.name}</p>
                            <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-md">
                              slug: {tp.slug}
                            </span>
                          </div>

                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditTopicId(tp._id)
                                setEditTopicName(tp.name)
                                setEditTopicSlug(tp.slug)
                              }}
                              className="h-8 w-8 hover:bg-white text-[#5D7B6F] rounded-lg"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteTopicTarget(tp)}
                              className="h-8 w-8 hover:bg-red-50 text-red-500 rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* SUB-TAB 2: THỂ LOẠI VĂN BẢN */}
          {aiSubTab === 'genre' && (
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Form Create Genre */}
              <Card className="md:col-span-1 flex flex-col justify-between bg-white border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <CardHeader className="py-3 px-4 border-b border-slate-100 shrink-0">
                  <CardTitle className="text-[#5D7B6F] text-base font-black">
                    Thêm Thể Loại Mới
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-1 flex flex-col justify-between">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (genreName.trim()) createGenreMutation.mutate({ name: genreName.trim(), description: genreDesc })
                    }}
                    className="space-y-3"
                  >
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Tên Thể Loại</label>
                      <Input value={genreName} onChange={(e) => setGenreName(e.target.value)} placeholder="Nhập tên thể loại..." className="rounded-xl py-4 font-medium text-sm" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Mô Tả</label>
                      <Input value={genreDesc} onChange={(e) => setGenreDesc(e.target.value)} placeholder="Nhập mô tả..." className="rounded-xl py-4 font-medium text-sm" />
                    </div>

                    <Button
                      type="submit"
                      disabled={createGenreMutation.isPending || !genreName.trim()}
                      className="w-full bg-[#5D7B6F] hover:bg-[#4a6358] py-5 rounded-xl font-bold text-sm mt-2"
                    >
                      Thêm Thể Loại
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Genres List */}
              <Card className="md:col-span-2 flex flex-col bg-white border-slate-200 rounded-2xl shadow-xs overflow-hidden h-full">
                <CardHeader className="py-3 px-4 border-b border-slate-100 shrink-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-[#5D7B6F] text-base font-black">
                    Danh Sách Thể Loại Văn Bản
                  </CardTitle>
                  <span className="text-xs font-bold text-gray-400">{genres.length} mục</span>
                </CardHeader>
                <CardContent className="p-3 flex-1 min-h-0 overflow-hidden">
                  {isGenresLoading ? (
                    <div className="p-8 text-center text-gray-400 italic text-sm">Đang tải danh sách...</div>
                  ) : genres.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-medium italic text-sm">
                      Chưa có thể loại văn bản nào.
                    </div>
                  ) : (
                    <ul className="space-y-2 h-full overflow-y-auto pr-1">
                      {genres.map((gn) => (
                        <li key={gn._id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-purple-300 transition-all group">
                          <div>
                            <p className="font-black text-slate-800 text-sm">{gn.name}</p>
                            <p className="text-xs font-medium text-gray-500 line-clamp-1">{gn.description || 'Chưa có mô tả'}</p>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteGenreTarget(gn)} className="h-8 w-8 hover:bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* MAIN TAB 2: ĐỀ THI QUIZ */}
      {mainTab === 'quiz_exam' && (
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
          <Card className="md:col-span-1 flex flex-col justify-between bg-white border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-100 shrink-0">
              <CardTitle className="text-[#5D7B6F] text-base font-black">Thêm Danh Mục Quiz</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-between">
              <form onSubmit={(e) => { e.preventDefault(); if (newName.trim()) createMutation.mutate(newName.trim()); }} className="space-y-4">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nhập tên danh mục..." className="rounded-xl py-5 font-medium text-sm" />
                <Button type="submit" disabled={createMutation.isPending || !newName.trim()} className="w-full bg-[#5D7B6F] hover:bg-[#4a6358] py-5 rounded-xl font-bold text-sm">
                  Thêm Danh Mục
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 flex flex-col bg-white border-slate-200 rounded-2xl shadow-xs overflow-hidden h-full">
            <CardContent className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="relative mb-3 shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm danh mục..." className="pl-10 py-4 rounded-xl bg-gray-50 border-none font-medium text-sm" />
              </div>
              {isCategoriesLoading ? (
                <div className="p-8 text-center text-gray-400 italic text-sm">Đang tải...</div>
              ) : publicCategories.length === 0 ? (
                <div className="p-8 text-center text-gray-400 font-medium italic text-sm">
                  {search ? 'Không tìm thấy danh mục nào.' : 'Chưa có danh mục nào.'}
                </div>
              ) : (
                <ul className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
                  {publicCategories.map((cat) => (
                    <li key={cat._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#EAE7D6]/30 border border-slate-100 hover:border-[#5D7B6F]/10 group transition-all">
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{cat.name}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" onClick={() => { setEditId(cat._id); setEditName(cat.name); }} className="h-8 w-8 rounded-lg"><Pencil className="h-3.5 w-3.5 text-[#5D7B6F]" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(cat)} className="h-8 w-8 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Topic Dialog (With Name & Slug) */}
      <Dialog open={!!editTopicId} onOpenChange={(open) => !open && setEditTopicId(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-[#5D7B6F]">Chỉnh sửa chủ đề & Slug</DialogTitle>
            <DialogDescription className="font-medium text-gray-500">
              Cập nhật tên hiển thị và mã slug định danh.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!editTopicId || !editTopicName.trim()) return
              updateTopicMutation.mutate({ id: editTopicId, name: editTopicName.trim(), slug: editTopicSlug.trim() })
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600">Tên Chủ Đề</label>
              <Input
                value={editTopicName}
                onChange={(e) => setEditTopicName(e.target.value)}
                placeholder="Nhập tên chủ đề mới..."
                className="rounded-xl py-5 border-slate-200 font-medium text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600">Mã Slug (URL / DB Identifier)</label>
              <Input
                value={editTopicSlug}
                onChange={(e) => setEditTopicSlug(e.target.value)}
                placeholder="VD: culture-arts"
                className="rounded-xl py-5 border-slate-200 font-mono text-xs"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditTopicId(null)} className="rounded-xl font-bold">
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={updateTopicMutation.isPending || !editTopicName.trim()}
                className="rounded-xl font-bold bg-[#5D7B6F] hover:bg-[#4a6358]"
              >
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Topic Dialog */}
      <Dialog open={!!deleteTopicTarget} onOpenChange={(open) => !open && setDeleteTopicTarget(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-red-600">Xác nhận xóa chủ đề</DialogTitle>
            <DialogDescription className="font-medium text-gray-500">
              Bạn có chắc chắn muốn xóa chủ đề <span className="font-black text-gray-800">&quot;{deleteTopicTarget?.name}&quot;</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteTopicTarget(null)} className="rounded-xl font-bold">
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTopicMutation.isPending}
              onClick={() => {
                if (deleteTopicTarget) deleteTopicMutation.mutate(deleteTopicTarget._id)
              }}
              className="rounded-xl font-bold"
            >
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Genre Dialog */}
      <Dialog open={!!deleteGenreTarget} onOpenChange={(open) => !open && setDeleteGenreTarget(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-red-600">Xác nhận xóa thể loại</DialogTitle>
            <DialogDescription className="font-medium text-gray-500">
              Bạn có chắc chắn muốn xóa thể loại văn bản <span className="font-black text-gray-800">&quot;{deleteGenreTarget?.name}&quot;</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteGenreTarget(null)} className="rounded-xl font-bold">
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              disabled={deleteGenreMutation.isPending}
              onClick={() => {
                if (deleteGenreTarget) deleteGenreMutation.mutate(deleteGenreTarget._id)
              }}
              className="rounded-xl font-bold"
            >
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Quiz Category Dialog */}
      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-[#5D7B6F]">Chỉnh sửa danh mục Quiz</DialogTitle>
            <DialogDescription className="font-medium text-gray-500">
              Cập nhật tên danh mục.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!editId || !editName.trim()) return
              updateMutation.mutate({ id: editId, name: editName.trim() })
            }}
            className="space-y-4"
          >
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nhập tên danh mục..."
              className="rounded-xl py-6 border-[#5D7B6F]/10 focus:ring-[#5D7B6F] font-medium"
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditId(null)} className="rounded-xl font-bold">
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || !editName.trim()}
                className="rounded-xl font-bold bg-[#5D7B6F] hover:bg-[#4a6358]"
              >
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Quiz Category Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-red-600">Xác nhận xóa</DialogTitle>
            <DialogDescription className="font-medium text-gray-500">
              Bạn có chắc chắn muốn xóa danh mục <span className="font-black text-gray-800">&quot;{deleteTarget?.name}&quot;</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="rounded-xl font-bold">
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget._id)
              }}
              className="rounded-xl font-bold"
            >
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
