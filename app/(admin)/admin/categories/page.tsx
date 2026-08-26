'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/shared/ui/dialog'
import { Pencil, Trash2, Search, Loader2 } from 'lucide-react'
import { useAdminCategories, Category } from '@/hooks/useAdminCategories'

export default function AdminCategoriesPage() {
  const {
    newName, setNewName,
    editId, setEditId,
    editName, setEditName,
    deleteTarget, setDeleteTarget,
    search, setSearch,
    isCategoriesLoading, publicCategories,
    createMutation, updateMutation, deleteMutation,
  } = useAdminCategories()

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl font-bold text-primary">Quản lý Danh mục Môn thi</h1>
        <p className="text-sm text-muted-foreground mt-1">Cấu hình danh mục môn thi trắc nghiệm công khai trên hệ thống</p>
      </div>

      <div className="space-y-6">
        <Card className="border-border bg-card text-card-foreground shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-black text-card-foreground">Danh mục Môn thi Public</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm danh mục..."
                className="pl-10 h-9 rounded-xl border-border bg-card text-card-foreground text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tên danh mục môn thi mới..."
                className="h-10 text-xs font-semibold rounded-xl border-border bg-card text-card-foreground"
              />
              <Button
                onClick={() => createMutation.mutate(newName.trim())}
                disabled={!newName.trim() || createMutation.isPending}
                className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl px-5 cursor-pointer"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Thêm mới'}
              </Button>
            </div>

            {isCategoriesLoading ? (
              <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-card">
                {publicCategories.length === 0 ? (
                  <div className="p-8 text-center text-xs font-bold text-muted-foreground">
                    Chưa có danh mục nào phù hợp
                  </div>
                ) : (
                  publicCategories.map((cat: Category) => (
                    <div key={cat._id} className="p-3.5 flex items-center justify-between bg-card text-xs font-bold text-card-foreground">
                      {editId === cat._id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-xs font-semibold rounded-lg bg-muted border-border text-card-foreground"
                          />
                          <Button size="sm" onClick={() => updateMutation.mutate({ id: cat._id, name: editName })} className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-xs">Lưu</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditId(null)} className="h-8 text-xs">Hủy</Button>
                        </div>
                      ) : (
                        <>
                          <span>{cat.name} ({cat.quizCount} quiz)</span>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setEditId(cat._id); setEditName(cat.name) }}><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(cat)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Category Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-primary">Xác nhận xóa danh mục</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Bạn có chắc chắn muốn xóa danh mục <span className="font-bold text-card-foreground">&quot;{deleteTarget?.name}&quot;</span>?
              {deleteTarget && (deleteTarget.quizCount > 0 || (deleteTarget.questionBankCount ?? 0) > 0) && (
                <span className="block text-destructive font-semibold mt-2">
                  ⚠️ Danh mục này hiện đang chứa {deleteTarget.quizCount} bài quiz và {deleteTarget.questionBankCount ?? 0} câu hỏi ngân hàng. Không thể xóa danh mục đang có dữ liệu liên kết.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="rounded-xl text-xs border-border">
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={!deleteTarget || deleteTarget.quizCount > 0 || (deleteTarget.questionBankCount ?? 0) > 0 || deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
              className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Xóa danh mục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
