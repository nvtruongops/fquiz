'use client'

import React from 'react'
import { useAdminCategories } from '@/hooks/categories/useAdminCategories'
import { CategoryList } from '@/components/categories/CategoryList'
import { CategoryDeleteDialog } from '@/components/categories/CategoryDeleteDialog'

export default function AdminCategoriesPage() {
  const {
    search,
    setSearch,
    newName,
    setNewName,
    editId,
    setEditId,
    editName,
    setEditName,
    deleteTarget,
    setDeleteTarget,
    filteredCategories,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  } = useAdminCategories()

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quản lý Danh mục Môn thi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cấu hình danh mục môn thi trắc nghiệm công khai trên hệ thống
        </p>
      </div>

      <CategoryList
        search={search}
        setSearch={setSearch}
        newName={newName}
        setNewName={setNewName}
        editId={editId}
        setEditId={setEditId}
        editName={editName}
        setEditName={setEditName}
        filteredCategories={filteredCategories}
        isLoading={isLoading}
        isCreating={createMutation.isPending}
        isUpdating={updateMutation.isPending}
        onCreate={(name) => createMutation.mutate(name)}
        onUpdate={(id, name) => updateMutation.mutate({ id, name })}
        onDeleteTarget={setDeleteTarget}
      />

      <CategoryDeleteDialog
        deleteTarget={deleteTarget}
        isPending={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
      />
    </div>
  )
}
