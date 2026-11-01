'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useTranslations } from '@fquiz/ui/i18n'

export interface ProfileData {
  username: string
  email: string
  avatarUrl: string
  bio: string
  createdAt: string
}

interface ProfileResponse {
  profile: ProfileData
}

export function useStudentProfile() {
  const { toast } = useToast()
  const t = useTranslations()
  const tRef = useRef(t)
  tRef.current = t
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [form, setForm] = useState({ username: '', bio: '' })

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/profile`,
          { credentials: 'include' }
        )
        if (!res.ok) {
          if (res.status === 404 || res.status === 501) {
            toast.info(tRef.current('profile.loadUnavailable'))
            return
          }
          toast.error(tRef.current('profile.loadFailed'))
          return
        }

        const data = (await res.json()) as ProfileResponse
        setProfile(data.profile)
        setForm({
          username: data.profile.username,
          bio: data.profile.bio,
        })
      } catch {
        toast.error(tRef.current('profile.systemBusy'))
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [toast])

  const bioLength = useMemo(() => form.bio.length, [form.bio])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/profile`,
        {
          method: 'PATCH',
          headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify({
            profile_bio: form.bio,
          }),
        }
      )

      if (!res.ok) {
        if (res.status === 404 || res.status === 501) {
          toast.info(t('profile.updateUnavailable'))
          return
        }
        const data = await res.json().catch(() => ({}))
        toast.error(t('profile.updateFailed'))
        return
      }

      const data = (await res.json()) as ProfileResponse
      setForm({
        username: data.profile.username,
        bio: data.profile.bio,
      })
      setProfile((prev) => ({
        username: data.profile.username,
        email: data.profile.email,
        avatarUrl: prev?.avatarUrl || '',
        bio: data.profile.bio,
        createdAt: data.profile.createdAt,
      }))
      toast.success(t('profile.updated'))
    } catch {
      toast.error(t('profile.systemBusy'))
    } finally {
      setSaving(false)
    }
  }

  async function handleRequestDeletion() {
    if (!deletePassword) {
      toast.error(t('profile.confirmPassword'))
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/account/request-deletion`,
        {
          method: 'POST',
          headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify({ password: deletePassword }),
        }
      )

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(t('profile.deleteFailed'))
        return
      }

      toast.success(t('profile.deleteSubmitted'))
      setDeleteDialogOpen(false)
      setDeletePassword('')

      setTimeout(() => {
        window.location.href = '/login?message=deletion_requested'
      }, 1200)
    } catch {
      toast.error(t('profile.connectionFailed'))
    } finally {
      setDeleting(false)
    }
  }

  return {
    loading,
    saving,
    deleting,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deletePassword,
    setDeletePassword,
    profile,
    form,
    setForm,
    bioLength,
    handleSave,
    handleRequestDeletion,
  }
}
