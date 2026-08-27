'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import { useAdminUsers } from '@/hooks/users/useAdminUsers'
import { UserTable } from '@/components/users/UserTable'

export default function AdminUsersPage() {
  const {
    page,
    setPage,
    search,
    setSearch,
    role,
    setRole,
    status,
    setStatus,
    data,
    isLoading,
    updateMutation,
    deleteMutation,
  } = useAdminUsers()

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý Tài khoản</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản trị trạng thái hoạt động và phân quyền học viên &amp; giáo viên
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Tìm theo username hoặc email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={role || 'all'}
          onValueChange={(val) => {
            setRole(val === 'all' ? '' : val)
            setPage(1)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tất cả vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả vai trò</SelectItem>
            <SelectItem value="student">Học viên (Student)</SelectItem>
            <SelectItem value="teacher">Giáo viên (Teacher)</SelectItem>
            <SelectItem value="admin">Quản trị viên (Admin)</SelectItem>
            <SelectItem value="dev">Nhà phát triển (Dev)</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={status || 'all'}
          onValueChange={(val) => {
            setStatus(val === 'all' ? '' : val)
            setPage(1)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang hoạt động (Active)</SelectItem>
            <SelectItem value="banned">Đã khóa (Banned)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <UserTable
        isLoading={isLoading}
        data={data}
        page={page}
        onPageChange={setPage}
        onUpdateRole={(id, newRole) =>
          updateMutation.mutate({ id, updates: { role: newRole } })
        }
        onUpdateStatus={(id, newStatus) =>
          updateMutation.mutate({ id, updates: { status: newStatus } })
        }
        onDeleteUser={(u) => {
          if (confirm(`Bạn có chắc chắn muốn xóa tài khoản ${u.username}?`)) {
            deleteMutation.mutate(u._id)
          }
        }}
      />
    </div>
  )
}
