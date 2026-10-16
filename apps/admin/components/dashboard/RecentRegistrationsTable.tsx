import React from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@fquiz/ui'

interface RecentUser {
  _id: string | { toString(): string }
  username: string
  email: string
  role: string
  status: string
  created_at: string | Date
}

interface RecentRegistrationsTableProps {
  users: RecentUser[]
}

export function RecentRegistrationsTable({ users }: RecentRegistrationsTableProps) {
  if (users.length === 0) {
    return <p className="text-muted-foreground text-sm py-4">No users found.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-border">
          <TableHead className="py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">User</TableHead>
          <TableHead className="py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Email</TableHead>
          <TableHead className="py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Role</TableHead>
          <TableHead className="py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Status</TableHead>
          <TableHead className="py-3 px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider text-right">Joined Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-border">
        {users.map((u) => (
          <TableRow key={u._id.toString()} className="hover:bg-muted/40 transition-colors">
            <TableCell className="py-3 px-3 font-medium text-foreground">{u.username}</TableCell>
            <TableCell className="py-3 px-3 text-muted-foreground">{u.email}</TableCell>
            <TableCell className="py-3 px-3">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                {u.role}
              </span>
            </TableCell>
            <TableCell className="py-3 px-3">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  u.status === 'active'
                    ? 'bg-success-bg text-success-fg border border-success-border'
                    : 'bg-destructive/10 text-destructive border border-destructive/30'
                }`}
              >
                {u.status}
              </span>
            </TableCell>
            <TableCell className="py-3 px-3 text-right text-xs text-muted-foreground">
              {new Date(u.created_at).toLocaleDateString('en-US')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
