'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Pencil, Trash2, Plus, Search, Check, X, Clock } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

import { useToast } from '@/lib/store/toast-store'
import { normalizeSearchInput, sanitizeQueryParams } from '@/lib/client-validation'
import { withCsrfHeaders } from '@/lib/csrf'

interface Category {
  _id: string
  name: string
  quizCount: number
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
  type: 'private' | 'public'
  owner_id?: string
}

async function fetchCategories(search = '', status = 'approved'): Promise<{ categories: Category[] }> {
  // Normalize and validate inputs
  const normalizedSearch = normalizeSearchInput(search, 200)
  
  // Validate enum values
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

async function updateCategoryStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/categories/${id}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error('Failed to update category status')
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('approved')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'categories', search, activeTab],
    queryFn: () => fetchCategories(search, activeTab),
  })

  const publicCategories = (data?.categories ?? []).filter((cat) => cat.type === 'public')

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => 
      updateCategoryStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      toast.success('Đã cập nhật trạng thái danh mục!')
    },
    onError: (err: Error) => toast.error(err.message)
  })

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
    onSuccess: (_data, deletedId) => {
      queryClient.setQueriesData({ queryKey: ['admin', 'categories'] }, (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object' || !('categories' in oldData)) return oldData
        const typed = oldData as { categories: Category[] }
        return {
          ...typed,
          categories: typed.categories.filter((cat) => cat._id !== deletedId),
        }
      })
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setDeleteTarget(null)
      toast.success('Đã xóa danh mục')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    createMutation.mutate(newName.trim())
  }

  const handleEdit = (cat: Category) => {
    setEditId(cat._id)
    setEditName(cat.name)
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editId || !editName.trim()) return
    updateMutation.mutate({ id: editId, name: editName.trim() })
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
           <h1 className="text-3xl font-black text-[#5D7B6F]">Quản lý Danh mục</h1>
           <Badge variant="outline" className="bg-[#5D7B6F]/5 text-[#5D7B6F] border-[#5D7B6F]/10 font-bold px-3 py-1">
              Admin Control Panel
           </Badge>
        </div>

        <Tabs defaultValue="approved" onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white/50 border border-[#5D7B6F]/10 p-1 rounded-2xl h-14 mb-6 shadow-sm">
            <TabsTrigger value="approved" className="rounded-xl px-8 font-bold data-[state=active]:bg-[#5D7B6F] data-[state=active]:text-white transition-all">
              Đã duyệt ({activeTab === 'approved' ? publicCategories.length : '...'})
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-xl px-8 font-bold data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all relative">
              Chờ duyệt ({activeTab === 'pending' ? publicCategories.length : '...'})
               {activeTab !== 'pending' && <div className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approved" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card className="md:col-span-1 bg-white border-[#5D7B6F]/10 rounded-3xl shadow-sm">
                 <CardHeader>
                   <CardTitle className="text-[#5D7B6F] text-lg font-black">Thêm Danh mục mới</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <form onSubmit={handleCreate} className="space-y-4">
                     <Input
                       value={newName}
                       onChange={(e) => setNewName(e.target.value)}
                       placeholder="Nhập tên danh mục..."
                       className="rounded-xl py-6 border-[#5D7B6F]/10 focus:ring-[#5D7B6F] font-medium"
                     />
                     <Button
                       type="submit"
                       disabled={createMutation.isPending}
                       className="w-full bg-[#5D7B6F] hover:bg-[#4a6358] py-6 rounded-xl font-bold"
                     >
                       <Plus className="h-5 w-5 mr-1" />
                       Xác nhận thêm
                     </Button>
                   </form>
                 </CardContent>
               </Card>

               <Card className="md:col-span-2 bg-white border-[#5D7B6F]/10 rounded-3xl shadow-sm">
                 <CardContent className="pt-6">
                    <div className="relative mb-6">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                       <Input 
                         value={search}
                         onChange={(e) => setSearch(e.target.value)}
                         placeholder="Tìm kiếm danh mục..."
                         className="pl-12 py-6 rounded-xl bg-gray-50 border-none focus:ring-[#5D7B6F] font-medium"
                       />
                    </div>

                    {isLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-50 animate-pulse rounded-xl" />)}
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {publicCategories.map((cat) => (
                           <li key={cat._id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#EAE7D6]/30 transition-all border border-transparent hover:border-[#5D7B6F]/5 group">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#5D7B6F] shadow-sm font-black">
                                    {cat.name.charAt(0)}
                                 </div>
                                 <div>
                                   <p className="font-bold text-gray-800">{cat.name}</p>
                                   <Badge variant="outline" className="text-[10px] bg-white border-[#5D7B6F]/10 text-gray-400 font-bold">
                                      {cat.quizCount} Quiz
                                   </Badge>
                                 </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Button size="icon" variant="ghost" onClick={() => handleEdit(cat)} className="hover:bg-white text-[#5D7B6F] rounded-xl">
                                    <Pencil className="h-4 w-4" />
                                 </Button>
                                 <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(cat)} className="hover:bg-red-50 text-red-500 rounded-xl">
                                    <Trash2 className="h-4 w-4" />
                                 </Button>
                              </div>
                           </li>
                        ))}
                      </ul>
                    )}
                 </CardContent>
               </Card>
            </div>
          </TabsContent>

          <TabsContent value="pending" className="space-y-6">
             <Card className="bg-white border-[#5D7B6F]/10 rounded-3xl shadow-sm border-t-4 border-orange-400">
                <CardHeader>
                   <CardTitle className="text-gray-800 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-500" />
                      Yêu cầu Phê duyệt Danh mục
                   </CardTitle>
                </CardHeader>
                <CardContent>
                   {publicCategories.length === 0 ? (
                     <div className="p-12 text-center text-gray-400 font-medium italic">Không có yêu cầu chờ duyệt.</div>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {publicCategories.map((cat) => (
                           <div key={cat._id} className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all space-y-4">
                              <div className="flex items-center justify-between">
                                 <Badge className="bg-orange-100 text-orange-600 border-none font-bold">Yêu cầu mới</Badge>
                                 <span className="text-[10px] text-gray-400 font-bold tracking-widest">{new Date(cat.created_at).toLocaleDateString()}</span>
                              </div>
                              <h3 className="text-xl font-black text-gray-800">{cat.name}</h3>
                              <p className="text-xs text-gray-400 font-medium">Đề xuất bởi: <span className="text-[#5D7B6F]">User #{cat.owner_id?.slice(-4)}</span></p>
                              <div className="flex gap-2 pt-2">
                                 <Button 
                                   onClick={() => statusMutation.mutate({ id: cat._id, status: 'approved' })}
                                   className="flex-1 bg-[#5D7B6F] hover:bg-[#4a6358] rounded-xl font-bold"
                                 >
                                    <Check className="h-4 w-4 mr-1" /> Duyệt
                                 </Button>
                                 <Button 
                                   onClick={() => statusMutation.mutate({ id: cat._id, status: 'rejected' })}
                                   variant="outline" 
                                   className="flex-1 border-red-100 text-red-500 hover:bg-red-50 rounded-xl font-bold"
                                 >
                                    <X className="h-4 w-4 mr-1" /> Từ chối
                                 </Button>
                              </div>
                           </div>
                        ))}
                     </div>
                   )}
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-[#5D7B6F]">Chỉnh sửa danh mục</DialogTitle>
            <DialogDescription className="font-medium text-gray-500">
              Cập nhật tên danh mục.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
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

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-red-600">Xác nhận xóa</DialogTitle>
            <DialogDescription className="font-medium text-gray-500">
               Bạn có chắc chắn muốn xóa danh mục <span className="font-black text-gray-800">"{deleteTarget?.name}"</span>? Hành động này không thể hoàn tác.
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
                if (!deleteTarget) return
                if (deleteTarget.type !== 'public') {
                  toast.error('Chỉ có thể xóa danh mục public ở màn admin.')
                  return
                }
                deleteMutation.mutate(deleteTarget._id)
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
