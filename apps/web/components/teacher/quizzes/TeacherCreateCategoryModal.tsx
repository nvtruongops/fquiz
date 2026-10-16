'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/shared/ui/dialog'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { AlertCircle } from 'lucide-react'

interface TeacherCreateCategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryName: string
  onCategoryNameChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  creating: boolean
  error: string
}

export function TeacherCreateCategoryModal({
  open,
  onOpenChange,
  categoryName,
  onCategoryNameChange,
  onSubmit,
  creating,
  error,
}: TeacherCreateCategoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-card-foreground">Create New Course Code</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Enter the course name or subject topic to create.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 bg-incorrect-bg text-destructive text-sm rounded-xl border border-incorrect-border flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-card-foreground">Course Code / Name (*)</label>
            <Input
              placeholder="Enter course name or subject topic..."
              value={categoryName}
              onChange={(e) => onCategoryNameChange(e.target.value)}
              required
              className="rounded-xl border-border bg-card text-card-foreground"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-border">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl cursor-pointer"
            >
              {creating ? 'Creating...' : 'Create Course Code'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
