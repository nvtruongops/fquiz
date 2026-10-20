'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/store/shared/toast-store'
import { EMAIL_REGEX } from '@/lib/core/schemas/common'

export function useForgotPasswordForm() {
  const { toast } = useToast()

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
        toast.error('Please enter a valid email address')
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
              toast.error(`Code recently sent. Please try again after ${data.retryAfterSec}s`)
            } else {
              toast.error('Too many requests. Please try again shortly.')
            }
            return
          }

          if (res.status >= 500) {
            toast.error('System is busy. Please try again later.')
            return
          }

          toast.error(typeof data.error === 'string' ? data.error : 'Failed to send verification code')
          return
        }

        if (typeof data.dev_code === 'string') setDevCode(data.dev_code)

        setCodeSent(true)
        setVerified(false)
        toast.success(
          'If an account exists for this email, a code may be sent. Check your inbox and spam; if it does not arrive, try again later.'
        )
      } catch {
        toast.error('System is busy. Please try again later.')
      } finally {
        setSendingCode(false)
      }
    },
    [email, toast]
  )

  const handleVerifyCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!/^\d{6}$/.test(code.trim())) {
        toast.error('Verification code must be 6 digits')
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
          toast.error(typeof data.error === 'string' ? data.error : 'Verification code is invalid or expired')
          return
        }

        setVerified(true)
        toast.success('Code verified. You can now set a new password.')
      } catch {
        toast.error('System is busy. Please try again later.')
      } finally {
        setVerifyingCode(false)
      }
    },
    [code, email, toast]
  )

  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!verified) {
        toast.error('Please verify the code first')
        return
      }

      if (newPassword.length < 8) {
        toast.error('Password must be at least 8 characters')
        return
      }

      if (newPassword !== confirmPassword) {
        toast.error('Passwords do not match')
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
          toast.error(typeof data.error === 'string' ? data.error : 'Password reset failed')
          return
        }

        setDone(true)
        toast.success('Password reset successfully. You can now sign in.')
      } catch {
        toast.error('System is busy. Please try again later.')
      } finally {
        setResetting(false)
      }
    },
    [code, confirmPassword, email, newPassword, toast, verified]
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
