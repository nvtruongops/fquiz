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

interface UserTableProps {
  isLoading: boolean
  data?: UsersResponse
  page: number
  onPageChange: (page: number) => void
  onUpdateRole: (id: string, role: string) => void
  onUpdateStatus: (id: string, status: string) => void
  onDeleteUser: (user: User) => void
}

export function UserTable({
  isLoading,
  data,
  page,
  onPageChange,
  onUpdateRole,
  onUpdateStatus,
  onDeleteUser,
}: UserTableProps) {
  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !data || data.users.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              Không tìm thấy tài khoản nào phù hợp
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Tài khoản</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Vai trò</th>
                    <th className="text-left py-3 px-4 font-semibold">Trạng thái</th>
                    <th className="text-left py-3 px-4 font-semibold">Ngày tạo</th>
                    <th className="text-right py-3 px-4 font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.users.map((u) => {
                    const isRootAdmin = u.role === 'admin'

                    return (
                      <tr key={u._id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {isRootAdmin && <ShieldCheck className="w-3.5 h-3.5 text-primary" />}
                            <span>{u.username}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                        <td className="py-3 px-4">
                          {isRootAdmin ? (
                            <Badge variant="outline" className="font-mono font-bold uppercase text-[11px]">
                              Admin
                            </Badge>
                          ) : (
                            <Select
                              value={u.role}
                              onValueChange={(newRole) => onUpdateRole(u._id, newRole)}
                            >
                              <SelectTrigger className="h-8 w-28 text-xs font-semibold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="teacher">Teacher</SelectItem>
                                <SelectItem value="dev">Dev</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={u.status === 'active' ? 'success' : 'destructive'}
                            className="text-xs capitalize"
                          >
                            {u.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isRootAdmin ? (
                            <span className="text-[11px] text-muted-foreground font-mono italic pr-2">
                              Hệ thống bảo vệ
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              {u.status === 'active' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onUpdateStatus(u._id, 'banned')}
                                  title="Khóa tài khoản"
                                  className="h-8 px-2 text-muted-foreground hover:text-destructive cursor-pointer"
                                >
                                  <UserX className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onUpdateStatus(u._id, 'active')}
                                  title="Mở khóa tài khoản"
                                  className="h-8 px-2 text-muted-foreground hover:text-success-fg cursor-pointer"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteUser(u)}
                                title="Xóa vĩnh viễn"
                                className="h-8 px-2 text-muted-foreground hover:text-destructive cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
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
            Tổng cộng: <span className="font-semibold text-foreground">{data.total}</span> tài khoản
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium px-2">
              Trang {page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
