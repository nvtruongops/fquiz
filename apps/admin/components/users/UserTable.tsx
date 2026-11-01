'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  UserX,
  UserCheck,
  Trash2,
  ShieldCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { User, UsersResponse } from '@/hooks/users/useAdminUsers'
import { useLocale, useTranslations } from '@fquiz/ui/i18n'

interface UserTableProps {
  isLoading: boolean
  isError: boolean
  error: Error | null
  onRetry: () => void
  data?: UsersResponse
  page: number
  onPageChange: (page: number) => void
  onUpdateRole: (id: string, role: string) => void
  onUpdateStatus: (id: string, status: string) => void
  onDeleteUser: (user: User) => void
}

export function UserTable({
  isLoading,
  isError,
  error,
  onRetry,
  data,
  page,
  onPageChange,
  onUpdateRole,
  onUpdateStatus,
  onDeleteUser,
}: UserTableProps) {
  const t = useTranslations()
  const { locale } = useLocale()
  return (
    <div className="space-y-4">
      {isError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error?.message || t('admin.failedToLoadUsers')}</span>
          <Button type="button" variant="outline" onClick={onRetry}>{t('admin.retry')}</Button>
        </div>
      )}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
            </div>
          ) : !data || (isError && data.users.length === 0) ? null : data.users.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {t('admin.noMatchingAccounts')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">{t('admin.user')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('admin.email')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('admin.role')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('admin.status')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('admin.createdDate')}</th>
                    <th className="text-right py-3 px-4 font-semibold">{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.users.map((u) => {
                    const isRootAdmin = u.role === 'admin'

                    return (
                      <tr key={u._id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {isRootAdmin && <ShieldCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />}
                            <span>{u.username}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                        <td className="py-3 px-4">
                          {isRootAdmin ? (
                            <Badge variant="outline" className="font-mono font-bold uppercase text-[11px]">
                              {t('nav.roleAdmin')}
                            </Badge>
                          ) : (
                            <Select
                              value={u.role}
                              onValueChange={(newRole) => onUpdateRole(u._id, newRole)}
                            >
                              <SelectTrigger className="h-8 w-28 text-xs font-semibold" aria-label={t('admin.changeRoleFor', { username: u.username })}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student">{t('nav.roleStudent')}</SelectItem>
                                <SelectItem value="teacher">{t('nav.roleTeacher')}</SelectItem>
                                <SelectItem value="dev">{t('admin.dev')}</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={u.status === 'active' ? 'success' : 'destructive'}
                            className="text-xs capitalize"
                          >
                            {u.status === 'active' ? t('admin.active') : t('admin.banned')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isRootAdmin ? (
                            <span className="text-[11px] text-muted-foreground font-mono italic pr-2">
                              {t('admin.protected')}
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              {u.status === 'active' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onUpdateStatus(u._id, 'banned')}
                                  title={t('admin.suspendAccount')}
                                  aria-label={t('admin.suspendAccountFor', { username: u.username })}
                                  className="h-8 px-2 text-muted-foreground hover:text-destructive cursor-pointer"
                                >
                                  <UserX className="w-4 h-4" aria-hidden="true" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onUpdateStatus(u._id, 'active')}
                                  title={t('admin.activateAccount')}
                                  aria-label={t('admin.activateAccountFor', { username: u.username })}
                                  className="h-8 px-2 text-muted-foreground hover:text-success-fg cursor-pointer"
                                >
                                  <UserCheck className="w-4 h-4" aria-hidden="true" />
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteUser(u)}
                                title={t('admin.deletePermanently')}
                                aria-label={t('admin.deleteAccountFor', { username: u.username })}
                                className="h-8 px-2 text-muted-foreground hover:text-destructive cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {data.total === 1 ? t('admin.totalAccount', { count: data.total }) : t('admin.totalAccounts', { count: data.total })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label={t('common.previousPage')}
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
            <span className="text-xs font-medium px-2">
              {t('admin.pageOf', { page, total: data.totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label={t('common.nextPage')}
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
