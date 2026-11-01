'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { LoginSchema } from '@/lib/modules/auth/schemas/auth'
import { useToast } from '@/store/shared/toast-store'
import type { AuthResponse, AuthUser } from '@/hooks/auth/useAuth'
import { startGlobalPageLoader } from '@/components/shared/ui/page-transition-loader'
import { clearAllUserCache } from '@/lib/core/utils/cache-invalidation'
import { useLocale, useTranslations } from '@fquiz/ui/i18n'

export function useLoginForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const t = useTranslations()
  const { locale, setLocale } = useLocale()
  const cardRef = useRef<HTMLDivElement>(null)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null)

  useEffect(() => {
    const error = searchParams.get('error')
    const reason = searchParams.get('reason')
    const message = searchParams.get('message')

    if (error) {
      toast.error(t('auth.invalidCredentials'))
    } else if (reason === 'account_banned') {
      toast.error(t('auth.accountSuspended'))
    } else if (reason === 'session_expired') {
      toast.error(t('auth.sessionExpired'))
    } else if (message === 'deletion_requested') {
      toast.info(t('auth.accountDeletionRequested'))
    }

    const raw = searchParams.get('callbackUrl') || searchParams.get('redirect')
    if (raw) {
      let decoded = raw
      try { decoded = decodeURIComponent(decoded) } catch (_err) { /* ignore URI malformed */ }
      try { decoded = decodeURIComponent(decoded) } catch (_err) { /* ignore URI malformed */ }
      
      if (decoded.startsWith('/') && !decoded.startsWith('//')) {
        const isAuthOrRoot = ['/', '/login', '/register', '/forgot-password', '/reset-password'].includes(decoded)
        if (!isAuthOrRoot) {
          setCallbackUrl(decoded)
        }
      }
    }
  }, [searchParams, t, toast])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const result = LoginSchema.safeParse({ identifier, password })
    if (!result.success) {
      const mapped: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!mapped[key]) mapped[key] = issue.message
      }
      setErrors(mapped as { identifier?: string; password?: string })
      const firstInvalid = e.currentTarget.elements.namedItem(mapped.identifier ? 'identifier' : 'password') as HTMLInputElement | null
      firstInvalid?.focus()
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, language: locale }),
      })

      const data = (await res.json().catch(() => ({}))) as { error?: string; role?: string; user?: AuthUser }

      if (!res.ok) {
        if (res.status === 403) {
          toast.error(t('auth.accountSuspended'))
          return
        }

        if (res.status === 429) {
          toast.error(t('auth.tooManyAttempts'))
          return
        }

        if (res.status >= 500) {
          toast.error(t('auth.systemUnavailable'))
          return
        }

        toast.error(t('auth.invalidCredentials'))
        return
      }

      toast.success(t('auth.signInSuccess'))
      startGlobalPageLoader('SUCCESS!', 'Redirecting...')
      setIsRedirecting(true)
      
      if (data.user) {
        if (data.user.language) setLocale(data.user.language)
        clearAllUserCache(queryClient)
        queryClient.setQueryData<AuthResponse>(['auth-user'], { user: data.user })
      } else {
        await queryClient.invalidateQueries({ queryKey: ['auth-user'] })
      }
      await queryClient.invalidateQueries({ queryKey: ['student'] })

      setTimeout(() => {
        if (data.role === 'admin') {
          const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || '/admin/login'
          window.location.href = adminUrl
          return
        }

        router.push(callbackUrl || '/dashboard')
        router.refresh()
      }, 100)
    } catch {
      toast.error(t('auth.systemBusy'))
    } finally {
      setLoading(false)
    }
  }

  return {
    cardRef,
    identifier,
    setIdentifier,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    errors,
    loading,
    isRedirecting,
    callbackUrl,
    handleSubmit,
  }
}
