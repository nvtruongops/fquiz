'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@fquiz/ui'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { User } from '@/hooks/users/useAdminUsers'
import { useTranslations } from '@fquiz/ui/i18n'

interface UserDeleteDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isDeleting?: boolean
}

export function UserDeleteDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}: UserDeleteDialogProps) {
  const t = useTranslations()
  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-foreground text-lg">{t('admin.deleteUserTitle')}</DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                {t('admin.deleteUserPermanentWarning')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <p className="text-sm text-foreground my-2">
          {t('admin.confirmDeleteUser', { username: user.username })}
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="cursor-pointer"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="cursor-pointer"
          >
            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
            {t('admin.deleteUser')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
