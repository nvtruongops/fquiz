'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-destructive/30 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-bold text-card-foreground mb-2">Invalid Link</h2>
          <p className="text-sm text-muted-foreground mb-4">Password reset token is missing or invalid.</p>
          <Link href="/forgot-password" className="text-sm text-primary font-medium hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    const errs: typeof errors = {}

    if (password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (password !== confirm) errs.confirm = 'Passwords do not match'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setServerError(data.error ?? 'An error occurred')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch {
      setServerError('An error occurred, please try again')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-success-border p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-success-fg" />
          </div>
          <h2 className="text-xl font-bold text-card-foreground mb-2">Reset Successful!</h2>
          <p className="text-sm text-muted-foreground">Redirecting to sign-in page…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full relative group">
      {/* 3D Depth Layer */}
      <div className="absolute inset-0 bg-primary/10 rounded-[32px] translate-y-3 blur-md transition-all duration-500 group-hover:translate-y-4" />
      
      <div className="relative bg-card text-card-foreground rounded-[32px] shadow-sm border border-border p-8 sm:p-10 transition-all duration-500">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-card-foreground">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter a new password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-card-foreground mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm outline-none transition-colors
                  focus:ring-2 focus:ring-primary/30 focus:border-primary bg-card text-card-foreground placeholder:text-muted-foreground
                  ${errors.password ? 'border-destructive bg-incorrect-bg' : 'border-border bg-muted/50 hover:border-primary/50'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-card-foreground mb-1.5">
              Confirm Password
            </label>
            <input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors
                focus:ring-2 focus:ring-primary/30 focus:border-primary bg-card text-card-foreground placeholder:text-muted-foreground
                ${errors.confirm ? 'border-destructive bg-incorrect-bg' : 'border-border bg-muted/50 hover:border-primary/50'}`}
            />
            {errors.confirm && <p className="text-destructive text-xs mt-1">{errors.confirm}</p>}
          </div>

          {serverError && (
            <div className="rounded-xl bg-incorrect-bg border border-incorrect-border px-3.5 py-2.5 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black py-3 rounded-xl shadow-md transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md bg-card rounded-2xl p-8 animate-pulse h-64" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
