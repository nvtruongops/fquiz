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
        <CardTitle className="text-base font-bold">Categories List</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            aria-label="Search categories"
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
            placeholder="Enter new category name..."
            aria-label="Enter new category name"
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
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="w-4 h-4" aria-hidden="true" />
            )}
            Add Category
          </Button>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No matching categories found
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
                      aria-label="Edit category name"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => onUpdate(cat._id, editName.trim())}
                      disabled={!editName.trim() || isUpdating}
                      aria-label="Save category name"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditId(null)}
                      aria-label="Cancel editing"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
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
                    aria-label={`Edit category ${cat.name}`}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteTarget(cat)}
                    aria-label={`Delete category ${cat.name}`}
                    className="h-8 px-2 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
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
