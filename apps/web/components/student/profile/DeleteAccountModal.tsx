'use client'

import React from 'react'
import { Trash2, AlertTriangle, KeyRound, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import { Button } from '@/components/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog'

interface DeleteAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  password: string
  onPasswordChange: (pass: string) => void
  deleting: boolean
  onConfirmDelete: () => void
}

export function DeleteAccountModal({
  open,
  onOpenChange,
  password,
  onPasswordChange,
  deleting,
  onConfirmDelete,
}: DeleteAccountModalProps) {
  return (
    <>
      <Card className="border-destructive/30 bg-destructive/5 rounded-xl sm:rounded-3xl shadow-xs">
        <CardHeader className="p-3.5 sm:p-6 pb-1 sm:pb-3">
          <CardTitle className="text-sm sm:text-base font-extrabold text-destructive flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-6 pt-2 sm:pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-destructive/20">
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-foreground">Request Account Deletion</h4>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 font-medium leading-relaxed">
                A confirmation email will be sent. You have 3 days to recover your account before all data is permanently erased.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => onOpenChange(true)}
              className="rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold shadow-xs shrink-0 cursor-pointer"
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-2xl sm:rounded-3xl max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 text-base sm:text-lg font-extrabold">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirm Account Deletion
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm font-medium text-muted-foreground mt-1.5">
              This action will schedule your account for permanent deletion in 3 days. Please enter your current password to verify.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label
                htmlFor="del-password"
                className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
              >
                Current Password
              </label>
              <div className="relative mt-1.5">
                <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="del-password"
                  type="password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder="Enter your password to continue"
                  className="pl-9 sm:pl-10 h-10 rounded-xl text-xs sm:text-sm border-border bg-card font-medium"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={deleting}
              className="rounded-xl text-xs sm:text-sm font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={deleting || !password}
              className="rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
            >
              {deleting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                'Submit Deletion Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default DeleteAccountModal
