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
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage user accounts, roles, permissions, and account statuses
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by username or email..."
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
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="dev">Developer</SelectItem>
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
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
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
          if (confirm(`Are you sure you want to delete user ${u.username}?`)) {
            deleteMutation.mutate(u._id)
          }
        }}
      />
    </div>
  )
}
