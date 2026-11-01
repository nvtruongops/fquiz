'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/store/shared/toast-store'
import { EMAIL_REGEX } from '@/lib/core/schemas/common'
import { useTranslations } from '@fquiz/ui/i18n'

export function useForgotPasswordForm() {
  const { toast } = useToast()
  const t = useTranslations()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [verified, setVerified] = useState(false)
  const [done, setDone] = useState(false)
  const [devCode, setDevCode] = useState('')
  const [retryAfterSec, setRetryAfterSec] = useState<number | null>(null)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleSendCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!email || !EMAIL_REGEX.test(email)) {
        toast.error(t('auth.invalidEmail'))
        return
      }

      setSendingCode(true)
      setRetryAfterSec(null)
      setDevCode('')

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send', email }),
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          if (res.status === 429) {
            if (typeof data.retryAfterSec === 'number') {
              setRetryAfterSec(data.retryAfterSec)
              toast.error(t('auth.codeRecentlySent', { seconds: data.retryAfterSec }))
            } else {
              toast.error(t('auth.tooManyRequests'))
            }
            return
          }

          if (res.status >= 500) {
            toast.error(t('auth.systemBusy'))
            return
          }

          toast.error(t('auth.sendCodeFailed'))
          return
        }

        if (typeof data.dev_code === 'string') setDevCode(data.dev_code)

        setCodeSent(true)
        setVerified(false)
        toast.success(
          t('auth.codeSentNotice')
        )
      } catch {
        toast.error(t('auth.systemBusy'))
      } finally {
        setSendingCode(false)
      }
    },
    [email, t, toast]
  )

  const handleVerifyCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!/^\d{6}$/.test(code.trim())) {
        toast.error(t('auth.codeMustSixDigits'))
        return
      }

      setVerifyingCode(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', email, code: code.trim() }),
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          toast.error(t('auth.codeInvalidExpired'))
          return
        }

        setVerified(true)
        toast.success(t('auth.codeVerified'))
      } catch {
        toast.error(t('auth.systemBusy'))
      } finally {
        setVerifyingCode(false)
      }
    },
    [code, email, t, toast]
  )

  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!verified) {
        toast.error(t('auth.verifyCodeFirst'))
        return
      }

      if (newPassword.length < 8) {
        toast.error(t('auth.passwordMinEight'))
        return
      }

      if (newPassword !== confirmPassword) {
        toast.error(t('auth.passwordMismatch'))
        return
      }

      setResetting(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: code.trim(), password: newPassword }),
        })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          toast.error(t('auth.passwordResetFailed'))
          return
        }

        setDone(true)
        toast.success(t('auth.passwordResetSuccess'))
      } catch {
        toast.error(t('auth.systemBusy'))
      } finally {
        setResetting(false)
      }
    },
    [code, confirmPassword, email, newPassword, t, toast, verified]
  )

  return {
    email,
    setEmail,
    code,
    setCode,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    codeSent,
    verified,
    done,
    devCode,
    retryAfterSec,
    sendingCode,
    verifyingCode,
    resetting,
    handleSendCode,
    handleVerifyCode,
    handleResetPassword,
  }
}
