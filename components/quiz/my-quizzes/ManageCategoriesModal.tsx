'use client'

import React from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/shared/ui/dialog'
import { Input } from '@/components/shared/ui/input'
import { Button } from '@/components/shared/ui/button'
import { Plus, Edit3, Trash2, Loader2 } from 'lucide-react'
import { Category } from '@/hooks/useMyQuizzes'

interface ManageCategoriesModalProps {
  isOpen: boolean
  onClose: () => void
  privateCategories: Category[]
  newCategoryName: string
  setNewCategoryName: (val: string) => void
  createCatMutation: any
  editingCategoryId: string | null
  setEditingCategoryId: (id: string | null) => void
  editingCategoryName: string
  setEditingCategoryName: (val: string) => void
  updateCatMutation: any
  confirmDeleteCatId: string | null
  setConfirmDeleteCatId: (id: string | null) => void
  deleteCatMutation: any
}

export default function ManageCategoriesModal({
  isOpen,
  onClose,
  privateCategories,
  newCategoryName,
  setNewCategoryName,
  createCatMutation,
  editingCategoryId,
  setEditingCategoryId,
  editingCategoryName,
  setEditingCategoryName,
  updateCatMutation,
  confirmDeleteCatId,
  setConfirmDeleteCatId,
  deleteCatMutation,
}: ManageCategoriesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined} className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-border bg-card shadow-2xl z-50">
        <DialogTitle className="text-base sm:text-lg font-black text-foreground mb-0.5">Quản lý danh mục cá nhân</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground mb-3">
          Tạo và sắp xếp các danh mục bài thi cá nhân của bạn.
        </DialogDescription>

        <div className="space-y-3">
          {/* Create Category Bar */}
          <div className="flex items-center gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Tên danh mục mới..."
              className="h-9 sm:h-10 text-xs font-semibold rounded-xl border-2 border-input bg-card text-foreground"
            />
            <Button
              disabled={!newCategoryName.trim() || createCatMutation.isPending}
              onClick={() => {
                createCatMutation.mutate(newCategoryName.trim(), {
                  onSuccess: () => setNewCategoryName(''),
                })
              }}
              className="h-9 sm:h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl px-3.5 sm:px-4 shrink-0"
            >
              {createCatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Tạo
            </Button>
          </div>

          {/* List of categories */}
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {privateCategories.length === 0 ? (
              <p className="text-xs font-medium text-muted-foreground text-center py-3">Chưa có danh mục cá nhân nào.</p>
            ) : (
              privateCategories.map((cat) => (
                <div key={cat._id} className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border text-xs font-bold text-foreground">
                  {editingCategoryId === cat._id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Input
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        className="h-8 text-xs font-semibold rounded-lg bg-card text-foreground"
                      />
                      <Button
                        size="sm"
                        onClick={() => updateCatMutation.mutate({ id: cat._id, name: editingCategoryName })}
                        disabled={updateCatMutation.isPending || !editingCategoryName.trim()}
                        className="h-8 bg-primary text-primary-foreground text-[11px] font-bold rounded-lg px-3"
                      >
                        Lưu
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingCategoryId(null)}
                        className="h-8 text-muted-foreground text-[11px] font-bold rounded-lg"
                      >
                        Hủy
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span>{cat.name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCategoryId(cat._id)
                            setEditingCategoryName(cat.name)
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-card-foreground rounded-lg cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCatMutation.mutate(cat._id)}
                          disabled={deleteCatMutation.isPending}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
