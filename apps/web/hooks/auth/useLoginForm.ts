'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { LoginSchema } from '@/lib/modules/auth/schemas/auth'
import { useToast } from '@/store/shared/toast-store'
import type { AuthResponse, AuthUser } from '@/hooks/auth/useAuth'
import { startGlobalPageLoader } from '@/components/shared/ui/page-transition-loader'

export function useLoginForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const { toast } = useToast()
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
      toast.error(decodeURIComponent(error))
    } else if (reason === 'account_banned') {
      toast.error('Your account has been suspended by an administrator. Please contact support.')
    } else if (reason === 'session_expired') {
      toast.error('Your session has expired. Please sign in again.')
    } else if (message === 'deletion_requested') {
      toast.info('Account deletion requested. Please check your email to recover your account if desired.')
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
  }, [searchParams, toast])

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
        body: JSON.stringify({ identifier, password }),
      })

      const data = (await res.json().catch(() => ({}))) as { error?: string; role?: string; user?: AuthUser }

      if (!res.ok) {
        if (res.status === 403) {
          toast.error(data.error || 'Your account has been suspended by an administrator.')
          return
        }

        if (res.status === 429) {
          toast.error(data.error || 'Too many attempts. Please try again later.')
          return
        }

        if (res.status >= 500) {
          toast.error('System is temporarily unavailable. Please try again later.')
          return
        }

        toast.error(data.error || 'Invalid credentials. Please verify your information.')
        return
      }

      toast.success('Sign in successful!')
      startGlobalPageLoader('SUCCESS!', 'Redirecting...')
      setIsRedirecting(true)
      
      if (data.user) {
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
      toast.error('System is busy. Please try again later.')
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
