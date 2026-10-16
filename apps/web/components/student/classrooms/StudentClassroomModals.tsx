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
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'

interface StudentClassroomModalsProps {
  joinModalOpen: boolean
  onSetJoinModalOpen: (open: boolean) => void
  joinCode: string
  onSetJoinCode: (code: string) => void
  joinPassword: string
  onSetJoinPassword: (password: string) => void
  showJoinPassword: boolean
  onSetShowJoinPassword: (show: boolean) => void
  joining: boolean
  errorMessage: string
  onJoinClass: (e: React.FormEvent) => void

  confirmLeaveId: string | null
  onSetConfirmLeaveId: (id: string | null) => void
  onLeaveClass: (id: string) => void
}

export function StudentClassroomModals({
  joinModalOpen,
  onSetJoinModalOpen,
  joinCode,
  onSetJoinCode,
  joinPassword,
  onSetJoinPassword,
  showJoinPassword,
  onSetShowJoinPassword,
  joining,
  errorMessage,
  onJoinClass,

  confirmLeaveId,
  onSetConfirmLeaveId,
  onLeaveClass,
}: StudentClassroomModalsProps) {
  return (
    <>
      {/* Join Classroom Modal */}
      <Dialog open={joinModalOpen} onOpenChange={onSetJoinModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground">Join Classroom</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter the 6-character code provided by your instructor to join the class.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onJoinClass} className="space-y-4 py-2">
            {errorMessage && (
              <div className="p-3 bg-incorrect-bg text-destructive text-xs rounded-xl border border-incorrect-border flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Class Code (*)
              </label>
              <Input
                placeholder="e.g. ABC123"
                value={joinCode}
                onChange={(e) => onSetJoinCode(e.target.value.toUpperCase())}
                maxLength={10}
                required
                className="rounded-xl h-11 text-center font-mono font-black text-lg tracking-widest uppercase border-border bg-card text-card-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Class Password (Optional)
              </label>
              <div className="relative">
                <Input
                  type={showJoinPassword ? 'text' : 'password'}
                  placeholder="Enter password provided by teacher..."
                  value={joinPassword}
                  onChange={(e) => onSetJoinPassword(e.target.value)}
                  className="rounded-xl h-11 pr-10 border-border bg-card text-card-foreground"
                />
                <button
                  type="button"
                  onClick={() => onSetShowJoinPassword(!showJoinPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showJoinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSetJoinModalOpen(false)}
                className="rounded-xl border-border h-11 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={joining}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl h-11 px-6 cursor-pointer shadow-xs"
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Class'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Leave Classroom Dialog */}
      <Dialog open={!!confirmLeaveId} onOpenChange={(open) => !open && onSetConfirmLeaveId(null)}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">Confirm Leaving Classroom?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              After leaving, you will no longer have access to assignments or gradebooks in this classroom unless re-approved by the instructor.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSetConfirmLeaveId(null)}
              className="rounded-xl border-border h-10 text-xs font-bold"
            >
              Keep
            </Button>
            <Button
              type="button"
              onClick={() => confirmLeaveId && onLeaveClass(confirmLeaveId)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-black text-xs uppercase tracking-wider rounded-xl h-10 px-5 cursor-pointer shadow-xs"
            >
              Leave Classroom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
