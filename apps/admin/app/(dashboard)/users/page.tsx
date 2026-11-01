'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import { useAdminUsers, type User } from '@/hooks/users/useAdminUsers'
import { UserTable } from '@/components/users/UserTable'
import { UserDeleteDialog } from '@/components/users/UserDeleteDialog'
import { useTranslations } from '@fquiz/ui/i18n'

export default function AdminUsersPage() {
  const t = useTranslations()
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
    isFetching,
    isSearchPending,
    isError,
    error,
    refetch,
    updateMutation,
    deleteMutation,
  } = useAdminUsers()

  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.userManagement')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.userManagementDescription')}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <Input
            placeholder={t('admin.searchUsers')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
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
          <SelectTrigger aria-label={t('admin.filterRole')}>
            <SelectValue placeholder={t('admin.allRoles')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allRoles')}</SelectItem>
            <SelectItem value="student">{t('nav.roleStudent')}</SelectItem>
            <SelectItem value="teacher">{t('nav.roleTeacher')}</SelectItem>
            <SelectItem value="admin">{t('nav.roleAdmin')}</SelectItem>
            <SelectItem value="dev">{t('admin.dev')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={status || 'all'}
          onValueChange={(val) => {
            setStatus(val === 'all' ? '' : val)
            setPage(1)
          }}
        >
          <SelectTrigger aria-label={t('admin.filterStatus')}>
            <SelectValue placeholder={t('admin.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('admin.active')}</SelectItem>
            <SelectItem value="banned">{t('admin.banned')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div aria-busy={isFetching || isSearchPending}>
        <UserTable
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
          data={data}
          page={page}
          onPageChange={setPage}
          onUpdateRole={(id, newRole) =>
            updateMutation.mutate({ id, updates: { role: newRole } })
          }
          onUpdateStatus={(id, newStatus) =>
            updateMutation.mutate({ id, updates: { status: newStatus } })
          }
          onDeleteUser={(u) => setUserToDelete(u)}
        />
      </div>

      <UserDeleteDialog
        user={userToDelete}
        open={Boolean(userToDelete)}
        onOpenChange={(open) => {
          if (!open) setUserToDelete(null)
        }}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => {
          if (userToDelete) {
            deleteMutation.mutate(userToDelete._id, {
              onSettled: () => setUserToDelete(null),
            })
          }
        }}
      />
    </div>
  )
}
