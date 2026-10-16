'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu'
import {
  Users,
  School,
  BookOpen,
  Copy,
  Check,
  ShieldCheck,
  MoreVertical,
  Key,
  Share2,
  Trash2,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import type { Classroom } from '@/hooks/useTeacherClassrooms'

interface ClassroomsGridListProps {
  classrooms: Classroom[]
  totalStudents: number
  totalQuizzes: number
  loading: boolean
  copiedCode: string | null
  onCopyCode: (code: string) => void
  onOpenCreateModal: () => void
  onOpenPasswordModal: (classroom: Classroom) => void
  onOpenShareModal: (classroom: Classroom) => void
  onConfirmDelete: (classroomId: string) => void
}

export function ClassroomsGridList({
  classrooms,
  totalStudents,
  totalQuizzes,
  loading,
  copiedCode,
  onCopyCode,
  onOpenCreateModal,
  onOpenPasswordModal,
  onOpenShareModal,
  onConfirmDelete,
}: ClassroomsGridListProps) {
  return (
    <div className="space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4">
          <School className="w-6 h-6 text-primary" />
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
              Active Classrooms
            </span>
            <span className="text-2xl font-black text-card-foreground">{classrooms.length}</span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-success-border shadow-xs flex items-center gap-4">
          <Users className="w-6 h-6 text-success-fg" />
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
              Total Students
            </span>
            <span className="text-2xl font-black text-card-foreground">{totalStudents}</span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-warning-border shadow-xs flex items-center gap-4">
          <BookOpen className="w-6 h-6 text-warning-fg" />
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
              My Quizzes
            </span>
            <span className="text-2xl font-black text-card-foreground">{totalQuizzes}</span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-success-border shadow-xs flex items-center gap-4">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
              Teaching Status
            </span>
            <span className="text-xs font-black text-success-fg bg-success-bg px-2 py-0.5 rounded-full border border-success-border">
              Ready
            </span>
          </div>
        </div>
      </div>

      {/* Classroom List Grid */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground font-semibold">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        </div>
      ) : classrooms.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-3xl bg-card p-8 space-y-4">
          <h3 className="text-xl font-black text-card-foreground">No classrooms yet</h3>
          <Button
            onClick={onOpenCreateModal}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6 cursor-pointer"
          >
            Create First Classroom
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map((c: Classroom) => (
            <Card
              key={c._id}
              className="border border-border shadow-xs hover:shadow-md transition-all flex flex-col justify-between rounded-2xl bg-card overflow-hidden"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <CardTitle className="text-lg font-bold text-card-foreground truncate">{c.name}</CardTitle>
                    {c.description && (
                      <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {c.description}
                      </CardDescription>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="p-1.5 rounded-xl text-muted-foreground hover:text-card-foreground hover:bg-muted cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-52 p-1.5 border-border bg-popover text-popover-foreground rounded-2xl shadow-xl z-50"
                    >
                      <DropdownMenuItem
                        onClick={() => onOpenPasswordModal(c)}
                        className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-card-foreground cursor-pointer hover:bg-muted"
                      >
                        <Key className="w-4 h-4 text-primary" />
                        <span className="text-xs">{c.password ? 'Change Password' : 'Add Password'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onOpenShareModal(c)}
                        className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-card-foreground cursor-pointer hover:bg-muted"
                      >
                        <Share2 className="w-4 h-4 text-success-fg" />
                        <span className="text-xs">Share Link</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onConfirmDelete(c._id)}
                        className="flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-destructive cursor-pointer hover:bg-incorrect-bg"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                        <span className="text-xs">Delete Classroom</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 text-xs space-y-3">
                <div className="flex items-center justify-between bg-muted/60 p-2.5 rounded-xl border border-border">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold uppercase text-muted-foreground">Class Code</span>
                    <span className="font-mono font-black text-card-foreground text-sm tracking-wider">
                      {c.code}
                    </span>
                  </div>
                  <button
                    onClick={() => onCopyCode(c.code)}
                    className="p-1.5 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-card-foreground cursor-pointer"
                  >
                    {copiedCode === c.code ? <Check className="w-4 h-4 text-success-fg" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-muted-foreground font-semibold pt-1">
                  <span>{c.student_count || 0} students</span>
                  <Link
                    href={`/teacher/classrooms/${c._id}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                  >
                    Enter class <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
