'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RegisterSchema } from '@/lib/modules/auth/schemas/auth'
import { useToast } from '@/store/shared/toast-store'
import { EMAIL_REGEX } from '@/lib/core/schemas/common'
import { useLocale, useTranslations } from '@fquiz/ui/i18n'

export function useRegisterForm() {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations()
  const { locale } = useLocale()

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [devCode, setDevCode] = useState('')
  const [retryAfterSec, setRetryAfterSec] = useState<number | null>(null)

  const getCallbackUrl = useCallback(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('callbackUrl') || params.get('redirect')
    if (raw) {
      let decoded = raw
      try {
        decoded = decodeURIComponent(decoded)
      } catch (_err) {
        /* ignore */
      }
      try {
        decoded = decodeURIComponent(decoded)
      } catch (_err) {
        /* ignore */
      }
      if (decoded.startsWith('/') && !decoded.startsWith('//')) {
        const isAuthOrRoot = ['/', '/login', '/register', '/forgot-password', '/reset-password'].includes(decoded)
        if (!isAuthOrRoot) {
          return decoded
        }
      }
    }
    return null
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors((prev) => (prev[e.target.name] ? { ...prev, [e.target.name]: '' } : prev))
  }, [])

  const handleSendCode = useCallback(async () => {
    if (!form.email || !EMAIL_REGEX.test(form.email)) {
      setErrors((prev) => ({ ...prev, email: t('auth.registrationEmailRequired') }))
      return
    }

    setSendingCode(true)
    setRetryAfterSec(null)
    setDevCode('')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/register/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 429 && typeof data.retryAfterSec === 'number') {
        setRetryAfterSec(data.retryAfterSec)
        toast.error(t('auth.waitBeforeCode', { seconds: data.retryAfterSec }))
        return
      }

      if (!res.ok) {
        toast.error(t('auth.sendCodeUnavailable'))
        return
      }

      setCodeSent(true)
      if (typeof data.dev_code === 'string') setDevCode(data.dev_code)
      toast.success(
        t('auth.registrationCodeSent')
      )
    } catch {
      toast.error(t('auth.systemBusy'))
    } finally {
      setSendingCode(false)
    }
  }, [form.email, t, toast])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const result = RegisterSchema.safeParse(form)
      if (!result.success) {
        const mapped: Record<string, string> = {}
        for (const issue of result.error.issues) {
          const key = String(issue.path[0] ?? 'form')
          if (!mapped[key]) mapped[key] = issue.message
        }
        setErrors(mapped)
        return
      }

      if (!/^\d{6}$/.test(form.verificationCode.trim())) {
        setErrors((prev) => ({ ...prev, verificationCode: t('auth.codeMustSixDigits') }))
        return
      }

      setErrors({})
      setLoading(true)

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.username,
            email: form.email,
            password: form.password,
            confirmPassword: form.confirmPassword,
            verificationCode: form.verificationCode.trim(),
            language: locale,
          }),
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          toast.error(t('auth.registrationFailed'))
          return
        }

        toast.success(t('auth.registrationSuccess'))
        setSuccess(true)
        const callbackUrl = getCallbackUrl()
        setTimeout(() => router.push(callbackUrl || '/login'), 2000)
      } catch {
        toast.error(t('auth.systemBusy'))
      } finally {
        setLoading(false)
      }
    },
    [form, getCallbackUrl, locale, router, t, toast]
  )

  const passwordStrength = (() => {
    const p = form.password
    if (!p) return null
    if (p.length < 8) return { label: t('auth.passwordTooShort'), color: 'bg-destructive', level: 1 }
    if (p.length < 10) return { label: t('auth.passwordWeak'), color: 'bg-warning-fg', level: 2 }
    if (!/[A-Z]/.test(p) || !/\d/.test(p)) return { label: t('auth.passwordMedium'), color: 'bg-warning-fg', level: 3 }
    return { label: t('auth.passwordStrong'), color: 'bg-success-fg', level: 4 }
  })()

  let sendCodeLabel = t('auth.sendCode')
  if (sendingCode) sendCodeLabel = t('auth.sending')
  else if (codeSent) sendCodeLabel = t('auth.resend')

  return {
    form,
    showPassword,
    setShowPassword,
    errors,
    success,
    loading,
    sendingCode,
    codeSent,
    devCode,
    retryAfterSec,
    handleChange,
    handleSendCode,
    handleSubmit,
    passwordStrength,
    sendCodeLabel,
  }
}
