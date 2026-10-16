'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shared/ui/dialog'
import { AlertCircle, Eye, EyeOff, Check, Copy } from 'lucide-react'
import type { Classroom } from '@/hooks/useTeacherClassrooms'

interface TeacherClassroomModalsProps {
  createModalOpen: boolean
  onSetCreateModalOpen: (open: boolean) => void
  name: string
  onSetName: (name: string) => void
  description: string
  onSetDescription: (desc: string) => void
  password: string
  onSetPassword: (pass: string) => void
  showPassword: boolean
  onSetShowPassword: (show: boolean) => void
  creating: boolean
  errorMessage: string
  onCreateClassroom: (e: React.FormEvent) => void

  passwordModalOpen: boolean
  onSetPasswordModalOpen: (open: boolean) => void
  selectedClassroomForPass: Classroom | null
  newPassword: string
  onSetNewPassword: (pass: string) => void
  showNewPassword: boolean
  onSetShowNewPassword: (show: boolean) => void
  updatingPass: boolean
  passMessage: string
  onUpdatePassword: (e: React.FormEvent) => void

  shareModalOpen: boolean
  onSetShareModalOpen: (open: boolean) => void
  selectedClassroomForShare: Classroom | null
  shareCopied: boolean
  onCopyShareUrl: (c: Classroom) => void
  getShareUrl: (c: Classroom) => string

  confirmDeleteId: string | null
  onSetConfirmDeleteId: (id: string | null) => void
  onDeleteClassroom: (id: string) => void
}

export function TeacherClassroomModals({
  createModalOpen,
  onSetCreateModalOpen,
  name,
  onSetName,
  description,
  onSetDescription,
  password,
  onSetPassword,
  showPassword,
  onSetShowPassword,
  creating,
  errorMessage,
  onCreateClassroom,

  passwordModalOpen,
  onSetPasswordModalOpen,
  selectedClassroomForPass,
  newPassword,
  onSetNewPassword,
  showNewPassword,
  onSetShowNewPassword,
  updatingPass,
  passMessage,
  onUpdatePassword,

  shareModalOpen,
  onSetShareModalOpen,
  selectedClassroomForShare,
  shareCopied,
  onCopyShareUrl,
  getShareUrl,

  confirmDeleteId,
  onSetConfirmDeleteId,
  onDeleteClassroom,
}: TeacherClassroomModalsProps) {
  return (
    <>
      {/* Modal 1: Create Classroom */}
      <Dialog open={createModalOpen} onOpenChange={onSetCreateModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">Create New Classroom</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Enter the classroom name and configure join password (if desired).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreateClassroom} className="space-y-4 py-2">
            {errorMessage && (
              <div className="p-3 bg-incorrect-bg text-destructive text-sm rounded-xl border border-incorrect-border flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Classroom Name (*)</label>
              <Input
                placeholder="e.g. English B1 - Section 4"
                value={name}
                onChange={(e) => onSetName(e.target.value)}
                required
                className="rounded-xl border-border bg-card text-card-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Classroom Description</label>
              <Input
                placeholder="Brief description of the classroom"
                value={description}
                onChange={(e) => onSetDescription(e.target.value)}
                className="rounded-xl border-border bg-card text-card-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">
                Join Password (Optional)
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password (leave blank for open access)"
                  value={password}
                  onChange={(e) => onSetPassword(e.target.value)}
                  className="rounded-xl pr-10 border-border bg-card text-card-foreground"
                />
                <button
                  type="button"
                  onClick={() => onSetShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSetCreateModalOpen(false)}
                className="rounded-xl border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl cursor-pointer"
              >
                {creating ? 'Creating...' : 'Create Class'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Edit Password Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={onSetPasswordModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">Configure Classroom Password</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {selectedClassroomForPass &&
                `Class: ${selectedClassroomForPass.name} (Code: ${selectedClassroomForPass.code})`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onUpdatePassword} className="space-y-4 py-2">
            {passMessage && (
              <div className="p-3 bg-success-bg text-success-fg text-sm rounded-xl border border-success-border flex items-center gap-2">
                <Check className="w-4 h-4 text-success-fg shrink-0" />
                <span>{passMessage}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">
                New Password (leave blank to remove)
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password..."
                  value={newPassword}
                  onChange={(e) => onSetNewPassword(e.target.value)}
                  className="rounded-xl pr-10 border-border bg-card text-card-foreground"
                />
                <button
                  type="button"
                  onClick={() => onSetShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSetPasswordModalOpen(false)}
                className="rounded-xl border-border"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={updatingPass}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl cursor-pointer"
              >
                {updatingPass ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Share Link Modal */}
      <Dialog open={shareModalOpen} onOpenChange={onSetShareModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">Share Classroom</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Send the direct link or class code for students to quickly join.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Class Code</label>
              <div className="p-3 bg-muted rounded-xl font-mono font-black text-center text-lg text-primary border border-border">
                {selectedClassroomForShare?.code}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Quick Join Link</label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={selectedClassroomForShare ? getShareUrl(selectedClassroomForShare) : ''}
                  className="rounded-xl text-xs bg-muted border-border text-card-foreground"
                />
                <Button
                  type="button"
                  onClick={() => selectedClassroomForShare && onCopyShareUrl(selectedClassroomForShare)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shrink-0 cursor-pointer"
                >
                  {shareCopied ? <Check className="w-4 h-4 text-success-fg" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onSetShareModalOpen(false)}
              className="rounded-xl border-border"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Delete Confirmation */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && onSetConfirmDeleteId(null)}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">Confirm Delete Classroom?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              This action will permanently delete the classroom, all assigned quizzes, and enrolled student data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSetConfirmDeleteId(null)}
              className="rounded-xl border-border"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => confirmDeleteId && onDeleteClassroom(confirmDeleteId)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold rounded-xl cursor-pointer"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
