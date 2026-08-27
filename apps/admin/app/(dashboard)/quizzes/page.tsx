'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus } from 'lucide-react'
import { useAdminQuizzes } from '@/hooks/quizzes/useAdminQuizzes'
import { QuizTable } from '@/components/quizzes/QuizTable'
import { QuizDeleteDialog } from '@/components/quizzes/QuizDeleteDialog'

export default function AdminQuizzesPage() {
  const {
    page,
    setPage,
    search,
    setSearch,
    category,
    setCategory,
    deleteTarget,
    setDeleteTarget,
    categories,
    data,
    isLoading,
    totalPages,
    updateStatusMutation,
    deleteMutation,
  } = useAdminQuizzes()

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý Đề thi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi, duyệt xuất bản và tạo mới đề thi trắc nghiệm trên hệ thống
          </p>
        </div>
        <Link href="/quizzes/new">
          <Button className="gap-2 font-bold shadow-sm cursor-pointer">
            <Plus className="w-4 h-4" />
            Tạo Quiz mới
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Tìm theo tiêu đề hoặc mã môn..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={category}
          onValueChange={(val) => {
            setCategory(val)
            setPage(1)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tất cả danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục môn</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quizzes Table */}
      <QuizTable
        isLoading={isLoading}
        data={data}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onUpdateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
        onDeleteTarget={setDeleteTarget}
      />

      {/* Delete Dialog */}
      <QuizDeleteDialog
        deleteTarget={deleteTarget}
        isPending={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
      />
    </div>
  )
}
