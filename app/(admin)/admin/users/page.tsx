'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Search,
  ShieldAlert,
  UserX,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/lib/store/toast-store'
import { normalizeSearchInput, clampPagination, sanitizeQueryParams } from '@/lib/client-validation'
import { withCsrfHeaders } from '@/lib/csrf'

interface User {
  _id: string
  username: string
  email: string
  role: 'admin' | 'student'
  status: 'active' | 'banned'
  created_at: string
}

interface UsersResponse {
  users: User[]
  total: number
  page: number
  totalPages: number
}

async function fetchUsers(page: number, search: string, role: string, status: string): Promise<UsersResponse> {
  // Normalize and validate inputs
  const normalizedSearch = normalizeSearchInput(search, 200)
  const { page: validPage, limit: validLimit } = clampPagination(page, 10)
  
  // Validate enum values
  const validRole = ['student', 'admin', ''].includes(role) ? role : ''
  const validStatus = ['active', 'banned', ''].includes(status) ? status : ''
  
  const queryParams = sanitizeQueryParams({
    page: validPage,
    limit: validLimit,
    ...(normalizedSearch.length >= 2 ? { search: normalizedSearch } : {}),
    ...(validRole ? { role: validRole } : {}),
    ...(validStatus ? { status: validStatus } : {}),
  })
  
  const params = new URLSearchParams(queryParams)
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/users?${params}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

async function bulkAction(ids: string[], action: 'delete' | 'ban' | 'unban') {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/users/bulk`, {
    method: 'POST',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ user_ids: ids, action }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Bulk action failed')
  }
  return res.json()
}

async function updateUser(id: string, updates: Record<string, unknown>) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/users/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Update failed')
  }
  return res.json()
}

function getCurrentUserId(): string | null {
  try {
    const cookie = document.cookie.split(';').find((c) => c.trim().startsWith('auth-token='))
    const token = cookie?.split('=')[1]
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.userId ?? null
  } catch {
    return null
  }
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const currentUserId = useMemo(() => getCurrentUserId(), [])
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkActionTarget, setBulkActionTarget] = useState<'ban' | 'delete' | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Debounce search
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null)
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    if (searchTimer) clearTimeout(searchTimer)
    const timer = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 400)
    setSearchTimer(timer)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, debouncedSearch, roleFilter, statusFilter],
    queryFn: () => fetchUsers(page, debouncedSearch, roleFilter, statusFilter),
  })

  const bulkMutation = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: 'delete' | 'ban' | 'unban' }) =>
      bulkAction(ids, action),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success(`Đã thực hiện thành công (${res.affected} tài khoản)`)
      setSelectedIds([])
      setBulkActionTarget(null)
      setConfirmText('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      updateUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Cập nhật thành công')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bulkAction([id], 'delete'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Đã xóa tài khoản')
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const users = data?.users ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectable = users.filter((u) => u.role !== 'admin' && u._id !== currentUserId)
    setSelectedIds(e.target.checked ? selectable.map((u) => u._id) : [])
  }

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleExecuteBulkAction = () => {
    if (confirmText !== 'CONFIRM' || !bulkActionTarget) return
    bulkMutation.mutate({ ids: selectedIds, action: bulkActionTarget })
  }

  return (
    <div className="p-8 relative min-h-screen pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#5D7B6F]">Quản lý Học viên</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total} tài khoản trong hệ thống
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <Card className="bg-white border-[#A4C3A2] shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5D7B6F] transition-colors" />
              <Input
                placeholder="Tìm kiếm theo tên hoặc email..."
                className="pl-9 bg-gray-50 border-gray-200 focus:bg-white focus:border-[#5D7B6F] focus:ring-[#5D7B6F]/20 transition-all rounded-xl"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label="Tìm kiếm học viên"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative">
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v === '_all' ? '' : v); setPage(1) }}>
                  <SelectTrigger className="h-10 rounded-xl border-gray-200 text-sm text-gray-600 bg-white focus:border-[#5D7B6F] focus:ring-[#5D7B6F]/20 w-36">
                    <SelectValue placeholder="Tất cả vai trò" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="_all">Tất cả vai trò</SelectItem>
                    <SelectItem value="student">Học viên</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === '_all' ? '' : v); setPage(1) }}>
                  <SelectTrigger className="h-10 rounded-xl border-gray-200 text-sm text-gray-600 bg-white focus:border-[#5D7B6F] focus:ring-[#5D7B6F]/20 w-40">
                    <SelectValue placeholder="Tất cả trạng thái" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="_all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="active">Hoạt động</SelectItem>
                    <SelectItem value="banned">Đã khóa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Floating Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <CheckSquare className="w-4 h-4 text-[#D7F9FA]" />
              </div>
              <span className="font-semibold text-sm">Đã chọn {selectedIds.length} tài khoản</span>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div className="flex gap-2">
              <button
                onClick={() => setBulkActionTarget('ban')}
                className="px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                Khóa TK
              </button>
              <button
                onClick={() => setBulkActionTarget('delete')}
                className="px-4 py-2 text-sm font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg transition-colors flex items-center gap-2"
              >
                <UserX className="w-4 h-4" />
                Xóa sạch
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-[#A4C3A2] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#EAE7D6]/50 text-gray-600 border-b border-[#A4C3A2]/50">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded text-[#5D7B6F] focus:ring-[#5D7B6F]"
                      checked={users.length > 0 && selectedIds.length === users.length}
                      onChange={handleSelectAll}
                      aria-label="Chọn tất cả"
                    />
                  </th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Người dùng</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Email</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Vai trò</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-center">Trạng thái</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 text-[#5D7B6F] mx-auto animate-spin" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <UserX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="font-medium text-lg">Không tìm thấy tài khoản nào</p>
                      <p className="text-sm">Hãy thử thay đổi bộ lọc tìm kiếm.</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          className="rounded text-[#5D7B6F] focus:ring-[#5D7B6F] disabled:opacity-30 disabled:cursor-not-allowed"
                          checked={selectedIds.includes(user._id)}
                          disabled={user.role === 'admin' || user._id === currentUserId}
                          onChange={() => handleSelect(user._id)}
                          aria-label={`Chọn ${user.username}`}
                        />
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{user.username}</td>
                      <td className="px-6 py-4 text-gray-500">{user.email}</td>
                      <td className="px-6 py-4">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#A4C3A2]/20 text-[#5D7B6F]">
                            <ShieldCheck className="w-3.5 h-3.5" /> Quản trị viên
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-600">
                            Học viên
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          {user.status === 'active' ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" title="Hoạt động" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/40" title="Đã khóa" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          {user.status === 'active' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={user.role === 'admin' || user._id === currentUserId}
                              onClick={() => updateMutation.mutate({ id: user._id, updates: { status: 'banned', ban_reason: 'manual' } })}
                            >
                              Khóa
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => updateMutation.mutate({ id: user._id, updates: { status: 'active' } })}
                            >
                              Mở khóa
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={user.role === 'admin' || user._id === currentUserId}
                            onClick={() => setDeleteTarget(user._id)}
                          >
                            Xóa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500 font-medium">
              {total > 0
                ? `Đang hiển thị ${(page - 1) * 10 + 1} đến ${Math.min(page * 10, total)} trên tổng số ${total} học viên`
                : 'Không có dữ liệu'}
            </span>
            {totalPages > 1 && (
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 rounded-lg"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <Button
                      key={pageNum}
                      variant="outline"
                      size="sm"
                      className={`w-8 h-8 rounded-lg ${page === pageNum ? 'bg-[#5D7B6F] text-white border-transparent hover:bg-[#4a6358] hover:text-white' : 'text-gray-600'}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                {totalPages > 5 && <span className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>}
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 rounded-lg"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Single User */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="border-red-100">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <UserX className="w-5 h-5" />
              Xác nhận xóa tài khoản
            </DialogTitle>
            <DialogDescription className="pt-3 text-gray-600">
              Bạn có chắc muốn xóa vĩnh viễn tài khoản này không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy bỏ
            </Button>
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Confirm Dialog for Bulk Actions */}
      <Dialog open={!!bulkActionTarget} onOpenChange={(open) => !open && setBulkActionTarget(null)}>
        <DialogContent className="border-red-100">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Xác nhận hành động nguy hiểm
            </DialogTitle>
            <DialogDescription className="pt-3 text-gray-600">
              Bạn đang thực hiện {bulkActionTarget === 'delete' ? 'xóa vĩnh viễn' : 'khóa'}{' '}
              <strong>{selectedIds.length} tài khoản</strong>. Hãy gõ chữ{' '}
              <strong className="text-red-500 font-mono">CONFIRM</strong> vào ô bên dưới để xác nhận
              lệnh. Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              placeholder="Gõ CONFIRM..."
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="border-red-200 focus:border-red-500 focus:ring-red-500/20"
              aria-label="Xác nhận hành động"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkActionTarget(null)
                setConfirmText('')
              }}
            >
              Hủy bỏ
            </Button>
            <Button
              disabled={confirmText !== 'CONFIRM' || bulkMutation.isPending}
              onClick={handleExecuteBulkAction}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {bulkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Thực thi lệnh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
