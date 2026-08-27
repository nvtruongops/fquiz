import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Search, Loader2, Plus, Check, X } from 'lucide-react'
import type { Category } from '@/hooks/categories/useAdminCategories'

interface CategoryListProps {
  search: string
  setSearch: (val: string) => void
  newName: string
  setNewName: (val: string) => void
  editId: string | null
  setEditId: (id: string | null) => void
  editName: string
  setEditName: (name: string) => void
  filteredCategories: Category[]
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  onCreate: (name: string) => void
  onUpdate: (id: string, name: string) => void
  onDeleteTarget: (cat: Category) => void
}

export function CategoryList({
  search,
  setSearch,
  newName,
  setNewName,
  editId,
  setEditId,
  editName,
  setEditName,
  filteredCategories,
  isLoading,
  isCreating,
  isUpdating,
  onCreate,
  onUpdate,
  onDeleteTarget,
}: CategoryListProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <CardTitle className="text-base font-bold">Danh sách Danh mục</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm danh mục..."
            className="pl-9 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Category Form */}
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nhập tên danh mục môn thi mới..."
            className="h-10"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                onCreate(newName.trim())
              }
            }}
          />
          <Button
            onClick={() => onCreate(newName.trim())}
            disabled={!newName.trim() || isCreating}
            className="gap-1.5 shrink-0"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Thêm mới
          </Button>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Chưa có danh mục nào phù hợp
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
            {filteredCategories.map((cat) => (
              <div
                key={cat._id}
                className="p-3.5 flex items-center justify-between bg-card hover:bg-muted/30 transition-colors text-sm"
              >
                {editId === cat._id ? (
                  <div className="flex items-center gap-2 flex-1 mr-4">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => onUpdate(cat._id, editName.trim())}
                      disabled={!editName.trim() || isUpdating}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditId(null)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <span className="font-semibold text-foreground">{cat.name}</span>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditId(cat._id)
                      setEditName(cat.name)
                    }}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteTarget(cat)}
                    className="h-8 px-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
